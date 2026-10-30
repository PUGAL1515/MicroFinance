
import calendar
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Customer, CustomerKYC, LoanApplication,
    Loan, EMISchedule, Collection,
)
from .serializers import (
    CustomerSerializer, CustomerKYCSerializer,
    KYCVerificationSerializer, LoanApplicationSerializer,
    LoanSerializer, EMIScheduleSerializer, CollectionSerializer,
)


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Customer.objects.all().order_by("-id")
        q = self.request.query_params.get("q", "").strip()
        branch_id = self.request.query_params.get("branch_id")

        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(mobile_number__icontains=q)
                | Q(email__icontains=q)
            )

        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        return qs


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = "customer_id"


class CustomerKYCListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerKYCSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return CustomerKYC.objects.filter(
            customer_id=self.kwargs["customer_id"]
        ).order_by("-id")

    def perform_create(self, serializer):
        customer = get_object_or_404(
            Customer, pk=self.kwargs["customer_id"]
        )
        serializer.save(customer=customer)


class KYCVerificationView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def patch(self, request, kyc_id):
        kyc = get_object_or_404(
            CustomerKYC.objects.select_for_update(), pk=kyc_id
        )
        serializer = KYCVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        kyc.status = serializer.validated_data["status"]
        kyc.verification_notes = serializer.validated_data.get(
            "verification_notes", ""
        )
        kyc.verified_by = str(request.user)
        kyc.verified_at = timezone.now()
        kyc.save()

        return Response(CustomerKYCSerializer(kyc).data)


class LoanApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = LoanApplicationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = LoanApplication.objects.select_related("customer").order_by("-id")
        customer_id = self.request.query_params.get("customer_id")
        loan_status = self.request.query_params.get("status")

        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if loan_status:
            qs = qs.filter(status=loan_status)

        return qs

    def perform_create(self, serializer):
        customer = serializer.validated_data["customer"]

        # Require at least one verified identity and address document.
        docs = CustomerKYC.objects.filter(
            customer=customer, status="verified"
        )
        has_identity = docs.filter(document_type="identity").exists()
        has_address = docs.filter(document_type="address").exists()

        if not has_identity or not has_address:
            raise ValidationError(
                "Verified identity and address KYC are required."
            )

        serializer.save(
            application_number=f"APP-{uuid4().hex[:12].upper()}"
        )


class LoanApplicationDetailView(generics.RetrieveUpdateAPIView):
    queryset = LoanApplication.objects.select_related("customer")
    serializer_class = LoanApplicationSerializer
    permission_classes = [AllowAny]


class LoanApplicationDecisionView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, application_id):
        application = get_object_or_404(
            LoanApplication.objects.select_for_update(),
            pk=application_id,
        )

        decision = request.data.get("decision")
        reason = request.data.get("reason", "")

        if application.status not in ["pending", "under_review"]:
            raise ValidationError("Application already finalized.")

        if decision == "reject":
            if not reason.strip():
                raise ValidationError(
                    {"reason": "Rejection reason is required."}
                )
            application.status = "rejected"
            application.rejection_reason = reason
            application.save()
            return Response(LoanApplicationSerializer(application).data)

        if decision != "approve":
            raise ValidationError(
                {"decision": "Use 'approve' or 'reject'."}
            )

        docs = CustomerKYC.objects.filter(
            customer=application.customer, status="verified"
        )
        if not (
            docs.filter(document_type="identity").exists()
            and docs.filter(document_type="address").exists()
        ):
            raise ValidationError("KYC verification is incomplete.")

        application.status = "approved"
        application.save()

        loan = Loan.objects.create(
            application=application,
            approved_amount=application.requested_amount,
            annual_interest_rate=application.annual_interest_rate,
            tenure_installments=application.tenure_installments,
            repayment_frequency=application.repayment_frequency,
        )

        return Response(
            LoanSerializer(loan).data,
            status=status.HTTP_201_CREATED,
        )


def add_months(start_date, months):
    month_index = start_date.month - 1 + months
    year = start_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


class LoanDisbursementView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, loan_id):
        loan = get_object_or_404(
            Loan.objects.select_for_update(), pk=loan_id
        )

        if loan.status != "approved":
            raise ValidationError("Loan is not awaiting disbursement.")

        if loan.installments.exists():
            raise ValidationError("EMI schedule already exists.")

        reference = request.data.get("disbursement_reference", "").strip()
        if not reference:
            raise ValidationError({
                "disbursement_reference": "Required."
            })

        count = loan.tenure_installments
        principal = loan.approved_amount
        rate = loan.annual_interest_rate / Decimal("100")

        periods_per_year = (
            Decimal("52")
            if loan.repayment_frequency == "weekly"
            else Decimal("12")
        )
        period_rate = rate / periods_per_year

        # Reducing-balance annuity installment calculation.
        if period_rate == 0:
            regular_payment = principal / Decimal(count)
        else:
            factor = (Decimal("1") + period_rate) ** count
            regular_payment = (
                principal * period_rate * factor / (factor - 1)
            )

        regular_payment = regular_payment.quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        balance = principal
        start_date = timezone.localdate()

        for number in range(1, count + 1):
            if loan.repayment_frequency == "weekly":
                due_date = start_date + timedelta(weeks=number)
            else:
                due_date = add_months(start_date, number)

            interest = (balance * period_rate).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

            if number == count:
                principal_part = balance
                payment_due = principal_part + interest
            else:
                payment_due = regular_payment
                principal_part = payment_due - interest

                # Guard against rounding issues.
                principal_part = min(principal_part, balance)
                payment_due = principal_part + interest

            EMISchedule.objects.create(
                loan=loan,
                installment_number=number,
                due_date=due_date,
                principal_amount=principal_part,
                interest_amount=interest,
                amount_due=payment_due,
            )

            balance -= principal_part

        loan.status = "disbursed"
        loan.disbursed_at = timezone.now()
        loan.disbursement_reference = reference
        loan.save()

        return Response(LoanSerializer(loan).data)


class LoanListView(generics.ListAPIView):
    queryset = Loan.objects.select_related(
        "application", "application__customer"
    ).order_by("-id")
    serializer_class = LoanSerializer
    permission_classes = [AllowAny]


class EMIListView(generics.ListAPIView):
    serializer_class = EMIScheduleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = EMISchedule.objects.select_related("loan").order_by("due_date")
        loan_id = self.request.query_params.get("loan_id")
        if loan_id:
            qs = qs.filter(loan_id=loan_id)
        return qs


class CollectionListCreateView(generics.ListCreateAPIView):
    serializer_class = CollectionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Collection.objects.select_related(
            "installment", "installment__loan"
        ).order_by("-id")

        loan_id = self.request.query_params.get("loan_id")
        if loan_id:
            qs = qs.filter(installment__loan_id=loan_id)

        return qs
