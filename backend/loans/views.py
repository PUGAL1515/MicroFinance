from email.mime import application
from django.db.models import Count, Q, Sum
from django.db import transaction
from django.shortcuts import get_object_or_404, render
from django.utils.dateparse import parse_date
from .models import (
    GroupLoanMemberInstallment,
    GroupCollection,
    GroupCollectionAllocation,
    GroupLoanMemberInstallment, 
    GroupMembership,
    GroupLoanApplication,
    GroupLoanInstallment,
    GroupLoanPlan,
    LoanGroup,
    GroupMembership,
    GroupLoanApplication,
    GroupLoanInstallment,
    GroupLoanPayment,
)
from .serializers import (
    GroupLoanMemberInstallmentSerializer,
    GroupCollectionSerializer,
    GroupLoanPlanSerializer,
    LoanGroupSerializer,
    GroupMembershipSerializer,
    GroupLoanApplicationSerializer,
    GroupLoanInstallmentSerializer,
    GroupLoanPaymentSerializer,
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from customer.models import Customer, CustomerKYC
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone

class GroupLoanPlanListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupLoanPlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = GroupLoanPlan.objects.all().order_by("-id")

        active = self.request.query_params.get("active")
        if active == "true":
            qs = qs.filter(is_active=True)
        elif active == "false":
            qs = qs.filter(is_active=False)

        return qs


class GroupLoanPlanDetailView(generics.RetrieveUpdateAPIView):
    queryset = GroupLoanPlan.objects.all()
    serializer_class = GroupLoanPlanSerializer
    permission_classes = [AllowAny]

    def perform_update(self, serializer):
        plan = self.get_object()

        if plan.is_active:
            raise ValidationError(
                "Active plans cannot be edited directly. "
                "Create a new plan version instead."
            )

        serializer.save()


class LoanGroupListCreateView(generics.ListCreateAPIView):
    serializer_class = LoanGroupSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = LoanGroup.objects.select_related("plan", "leader")
        qs = qs.annotate(
            active_member_count=Count(
                "memberships",
                filter=Q(memberships__is_active=True),
            )
        )

        branch_id = self.request.query_params.get("branch_id")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        return qs

    def perform_create(self, serializer):
        plan = serializer.validated_data["plan"]

        if not plan.is_active:
            raise ValidationError(
                {"plan": "Select an active Group Loan Plan."}
            )

        serializer.save()


class LoanGroupDetailView(generics.RetrieveUpdateAPIView):
    queryset = LoanGroup.objects.select_related("plan", "leader")
    serializer_class = LoanGroupSerializer
    permission_classes = [AllowAny]


class GroupMembersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, group_id):
        group = get_object_or_404(LoanGroup, pk=group_id)
        memberships = group.memberships.select_related(
            "customer"
        ).order_by("-id")

        return Response(
            GroupMembershipSerializer(memberships, many=True).data
        )

    
    @transaction.atomic
    def post(self, request, group_id):
        # 1. Verify group
        group = LoanGroup.objects.select_for_update().filter(
            pk=group_id
        ).first()

        if not group:
            return Response(
                {"detail": f"Group ID {group_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if group.status not in ["forming", "pending"]:
            raise ValidationError(
                "Members cannot be changed after group activation."
            )

        # 2. Verify customer ID
        customer_id = request.data.get("customer")

        if not customer_id:
            return Response(
                {"customer": "Customer ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer = Customer.objects.filter(
            pk=customer_id,
            is_active=True,
        ).first()

        if not customer:
            return Response(
                {
                    "detail": (
                        f"Active customer with ID {customer_id} "
                        "was not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # 3. Prevent duplicate membership
        if group.memberships.filter(customer=customer).exists():
            return Response(
                {"detail": "Customer is already in this group."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Check plan member limit
        count = group.memberships.filter(is_active=True).count()

        if count >= group.plan.max_members:
            return Response(
                {"detail": "Maximum member count reached for this plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 5. Create membership
        membership = GroupMembership.objects.create(
            group=group,
            customer=customer,
            is_leader=request.data.get("is_leader", False),
        )

        return Response(
            GroupMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )

MONEY = Decimal("0.01")


def money(value):
    return Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)


def active_group_members(group):
    return list(
        group.memberships.filter(
            is_active=True,
            customer__is_active=True,
        ).select_related("customer")
    )


def validate_group_kyc(group):
    members = active_group_members(group)
    plan = group.plan

    if not plan.is_active:
        raise ValidationError("The selected loan plan is inactive.")

    if not plan.min_members <= len(members) <= plan.max_members:
        raise ValidationError(
            f"This plan requires {plan.min_members} to "
            f"{plan.max_members} active members. Current count: {len(members)}."
        )

    if not members:
        raise ValidationError("Add active members before applying for a loan.")

    incomplete = []

    for membership in members:
        docs = CustomerKYC.objects.filter(
            customer=membership.customer,
        )

        identity_ok = docs.filter(
            document_type="identity", status="verified"
        ).exists()

        address_ok = docs.filter(
            document_type="address", status="verified"
        ).exists()

        if not identity_ok or not address_ok:
            incomplete.append({
                "customer_id": membership.customer_id,
                "identity_verified": identity_ok,
                "address_verified": address_ok,
            })

    if incomplete:
        raise ValidationError({
            "detail": "Every active group member must pass Identity and Address KYC.",
            "incomplete_members": incomplete,
        })

    return members


class GroupLoanApplicationListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = GroupLoanApplication.objects.select_related(
            "group", "group__plan"
        ).order_by("-id")

        group_id = request.query_params.get("group_id")
        if group_id:
            qs = qs.filter(group_id=group_id)

        loan_status = request.query_params.get("status")
        if loan_status:
            qs = qs.filter(status=loan_status)

        return Response(
            GroupLoanApplicationSerializer(qs, many=True).data
        )

    @transaction.atomic
    def post(self, request):
        group = get_object_or_404(
            LoanGroup.objects.select_for_update().select_related("plan"),
            pk=request.data.get("group"),
        )

        if group.status not in ("forming", "pending", "active"):
            raise ValidationError("This group cannot apply for a loan.")

        members = validate_group_kyc(group)
        plan = group.plan

        try:
            per_member = money(request.data.get("requested_per_member", "0"))
        except Exception:
            raise ValidationError("Enter a valid per-member loan amount.")

        if per_member < plan.min_loan_per_member:
            raise ValidationError({
                "requested_per_member": "Amount is below the plan minimum."
            })

        if per_member > plan.max_loan_per_member:
            raise ValidationError({
                "requested_per_member": "Amount exceeds the plan maximum."
            })

        total = money(per_member * len(members))

        if total > plan.max_group_loan_amount:
            raise ValidationError({
                "requested_per_member":
                    "Total requested amount exceeds the plan's group limit."
            })

        # Avoid multiple open applications for the same group.
        if GroupLoanApplication.objects.filter(
            group=group,
            status__in=["submitted", "approved", "disbursed"],
        ).exists():
            raise ValidationError(
                "This group already has an open or active loan application."
            )

        application = GroupLoanApplication.objects.create(
            group=group,
            requested_per_member=per_member,
            requested_total=total,
            interest_rate=plan.annual_interest_rate,
            interest_method=plan.interest_method,
            tenure_months=plan.tenure_months,
            repayment_frequency=plan.repayment_frequency,
            application_notes=request.data.get("application_notes", ""),
        )

        group.status = "pending"
        group.save(update_fields=["status"])

        return Response(
            GroupLoanApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class GroupLoanDecisionView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def patch(self, request, application_id):
        application = get_object_or_404(
            GroupLoanApplication.objects.select_for_update().select_related(
                "group", "group__plan"
            ),
            pk=application_id,
        )

        if application.status != "submitted":
            raise ValidationError(
                "Only submitted applications can be approved or rejected."
            )

        decision = request.data.get("status")
        notes = request.data.get("decision_notes", "")

        if decision not in ("approved", "rejected"):
            raise ValidationError({
                "status": "Choose approved or rejected."
            })

        application.decision_notes = notes
        application.decided_at = timezone.now()

        if decision == "rejected":
            application.status = "rejected"
            application.save()
            return Response(GroupLoanApplicationSerializer(application).data)

        # Recheck KYC and member count at decision time.
        validate_group_kyc(application.group)

        try:
            approved_total = money(
                request.data.get(
                    "approved_total", application.requested_total
                )
            )
        except Exception:
            raise ValidationError("Enter a valid approved total.")

        plan = application.group.plan
        members = active_group_members(application.group)

        if approved_total <= 0:
            raise ValidationError("Approved amount must be greater than zero.")

        if approved_total > application.requested_total:
            raise ValidationError(
                "Approved amount cannot exceed the requested amount."
            )

        if approved_total > plan.max_group_loan_amount:
            raise ValidationError("Approved amount exceeds the plan limit.")

        approved_per_member = approved_total / Decimal(len(members))

        if approved_per_member < plan.min_loan_per_member:
            raise ValidationError(
                "Approved amount falls below the minimum per-member loan."
            )

        application.approved_total = approved_total
        application.status = "approved"
        application.save()

        return Response(GroupLoanApplicationSerializer(application).data)


def installment_count(tenure_months, frequency):
    if frequency == "weekly":
        return max(1, (tenure_months * 52 + 11) // 12)
    if frequency == "fortnightly":
        return max(1, (tenure_months * 24 + 11) // 12)
    return max(1, tenure_months)


def next_due_date(start, frequency):
    if frequency == "weekly":
        return start + timedelta(days=7)
    if frequency == "fortnightly":
        return start + timedelta(days=15)

    # Keep the date near the same day in the following month.
    import calendar
    year = start.year + (start.month // 12)
    month = start.month % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def calculate_schedule(application, start_date):
    principal = money(application.approved_total)
    periods = installment_count(
        application.tenure_months,
        application.repayment_frequency,
    )

    annual_rate = application.interest_rate / Decimal("100")

    if application.interest_method == "flat":
        total_interest = money(
            principal * annual_rate *
            Decimal(application.tenure_months) / Decimal("12")
        )
        regular_principal = money(principal / periods)
        regular_interest = money(total_interest / periods)

        rows = []
        remaining_principal = principal
        due_date = start_date

        for number in range(1, periods + 1):
            principal_due = (
                remaining_principal
                if number == periods
                else regular_principal
            )
            interest_due = (
                total_interest - sum(
                    (row["interest_due"] for row in rows),
                    Decimal("0.00"),
                )
                if number == periods
                else regular_interest
            )
            rows.append({
                "installment_number": number,
                "due_date": due_date,
                "principal_due": money(principal_due),
                "interest_due": money(interest_due),
                "total_due": money(principal_due + interest_due),
            })
            remaining_principal -= principal_due
            due_date = next_due_date(
                due_date, application.repayment_frequency
            )

        return rows

    # Reducing balance EMI: periodic rate derived from annual rate.
    periods_per_year = {
        "weekly": Decimal("52"),
        "fortnightly": Decimal("24"),
        "monthly": Decimal("12"),
    }[application.repayment_frequency]

    rate = annual_rate / periods_per_year

    if rate == 0:
        emi = money(principal / periods)
    else:
        factor = (Decimal("1") + rate) ** periods
        emi = money(principal * rate * factor / (factor - Decimal("1")))

    remaining = principal
    due_date = start_date
    rows = []

    for number in range(1, periods + 1):
        interest_due = money(remaining * rate)
        principal_due = money(
            remaining if number == periods else emi - interest_due
        )
        principal_due = min(principal_due, remaining)
        total_due = money(principal_due + interest_due)

        rows.append({
            "installment_number": number,
            "due_date": due_date,
            "principal_due": principal_due,
            "interest_due": interest_due,
            "total_due": total_due,
        })

        remaining = money(remaining - principal_due)
        due_date = next_due_date(
            due_date, application.repayment_frequency
        )

    return rows


class GroupLoanScheduleView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, application_id):
        application = get_object_or_404(
            GroupLoanApplication.objects.select_for_update(),
            pk=application_id,
        )

        if application.status != "approved":
            raise ValidationError(
                "Only approved loans can generate an EMI schedule."
            )

        # If schedule already exists, return it instead of creating again.
        existing_installments = application.installments.all().order_by(
            "installment_number"
        )

        if existing_installments.exists():
            return Response({
                "detail": "EMI schedule already exists.",
                "application_id": application.id,
                "has_schedule": True,
                "installment_count": existing_installments.count(),
                "installments": GroupLoanInstallmentSerializer(
                    existing_installments,
                    many=True,
                ).data,
            }, status=status.HTTP_200_OK)

        # Validate members and KYC before creating schedule.
        members = validate_group_kyc(application.group)

        if not members:
            raise ValidationError("No active group members found.")

        start_date_raw = request.data.get("first_due_date")

        if start_date_raw:
            from django.utils.dateparse import parse_date

            first_due_date = parse_date(start_date_raw)

            if not first_due_date:
                raise ValidationError(
                    "first_due_date must use YYYY-MM-DD format."
                )
        else:
            first_due_date = date.today()

        rows = calculate_schedule(
            application,
            first_due_date,
        )

        # Create group-level EMI installments.
        installments = [
            GroupLoanInstallment(
                application=application,
                **row,
            )
            for row in rows
        ]

        GroupLoanInstallment.objects.bulk_create(installments)

        created_installments = list(
            application.installments.order_by("installment_number")
        )

        member_count = len(members)
        member_installments = []

        for installment in created_installments:
            principal_share = money(
                installment.principal_due / Decimal(member_count)
            )
            interest_share = money(
                installment.interest_due / Decimal(member_count)
            )

            allocated_principal = Decimal("0.00")
            allocated_interest = Decimal("0.00")

            for index, membership in enumerate(members):

                # Last member receives rounding remainder.
                if index == member_count - 1:
                    member_principal = money(
                        installment.principal_due - allocated_principal
                    )
                    member_interest = money(
                        installment.interest_due - allocated_interest
                    )
                else:
                    member_principal = principal_share
                    member_interest = interest_share

                member_installments.append(
                    GroupLoanMemberInstallment(
                        installment=installment,
                        membership=membership,
                        principal_due=member_principal,
                        interest_due=member_interest,
                        total_due=money(
                            member_principal + member_interest
                        ),
                    )
                )

                allocated_principal += member_principal
                allocated_interest += member_interest

        GroupLoanMemberInstallment.objects.bulk_create(
            member_installments
        )

        return Response({
            "detail": "EMI schedule generated successfully.",
            "application_id": application.id,
            "has_schedule": True,
            "principal": str(application.approved_total),
            "installment_count": len(rows),
            "member_installment_count": len(member_installments),
            "total_interest": str(
                money(
                    sum(
                        (row["interest_due"] for row in rows),
                        Decimal("0.00"),
                    )
                )
            ),
            "total_payable": str(
                money(
                    sum(
                        (row["total_due"] for row in rows),
                        Decimal("0.00"),
                    )
                )
            ),
            "installments": GroupLoanInstallmentSerializer(
                created_installments,
                many=True,
            ).data,
        }, status=status.HTTP_201_CREATED)


class GroupLoanDisbursementView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, application_id):
        application = get_object_or_404(
            GroupLoanApplication.objects.select_for_update().select_related(
                "group"
            ),
            pk=application_id,
        )

        if application.status != "approved":
            raise ValidationError(
                "Only approved loans can be disbursed."
            )

        if not application.installments.exists():
            raise ValidationError(
                "Generate the EMI schedule before disbursement."
            )

        application.status = "disbursed"
        application.save(update_fields=["status"])

        group = application.group
        group.status = "active"
        group.save(update_fields=["status"])

        return Response({
            "detail": "Loan marked as disbursed.",
            "application": GroupLoanApplicationSerializer(
                application
            ).data,
        }, status=status.HTTP_200_OK)

class GroupLoanPaymentView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, installment_id):
        installment = get_object_or_404(
            GroupLoanInstallment.objects.select_for_update().select_related(
                "application"
            ),
            pk=installment_id,
        )

        if installment.application.status != "disbursed":
            raise ValidationError(
                "Payments can be collected only after disbursement."
            )

        try:
            amount = money(request.data.get("amount", "0"))
        except Exception:
            raise ValidationError("Enter a valid payment amount.")

        if amount <= 0:
            raise ValidationError("Payment must be greater than zero.")

        balance = installment.balance_due

        if amount > balance:
            raise ValidationError(
                f"Payment exceeds the outstanding balance of {balance}."
            )

        serializer = GroupLoanPaymentSerializer(data={
            "installment": installment.id,
            "amount": str(amount),
            "payment_date": request.data.get(
                "payment_date", date.today().isoformat()
            ),
            "reference": request.data.get("reference", ""),
            "notes": request.data.get("notes", ""),
        })
        serializer.is_valid(raise_exception=True)

        serializer.save()
        installment.paid_amount = money(installment.paid_amount + amount)

        if installment.paid_amount >= installment.total_due:
            installment.status = "paid"
        else:
            installment.status = "partial"

        installment.save(update_fields=["paid_amount", "status"])

        return Response({
            "payment": serializer.data,
            "installment": GroupLoanInstallmentSerializer(
                installment
            ).data,
        }, status=status.HTTP_201_CREATED)

class GroupLoanInstallmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, application_id):
        application = GroupLoanApplication.objects.filter(
            id=application_id
        ).first()

        if not application:
            return Response(
                {"detail": "Group loan application not found."},
                status=404,
            )

        installments = GroupLoanInstallment.objects.filter(
            application_id=application_id
        ).order_by("installment_number")

        data = []

        for item in installments:
            data.append({
                "id": item.id,
                "application": application_id,
                "installment_number": item.installment_number,
                "due_date": item.due_date,
                "principal_due": item.principal_due,
                "interest_due": item.interest_due,
                "total_due": item.total_due,
                "paid_amount": item.paid_amount,
                "balance_due": item.balance_due,
                "status": item.status,
            })

        return Response({
            "application_id": application_id,
            "count": len(data),
            "installments": data,
        })

class GroupCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, application_id):
        application = get_object_or_404(
            GroupLoanApplication.objects.select_related("group"),
            pk=application_id,
        )

        member_installments = (
            GroupLoanMemberInstallment.objects
            .filter(installment__application=application)
            .select_related(
                "membership__customer",
                "installment",
            )
            .order_by(
                "installment__installment_number",
                "membership__customer__id",
            )
        )

        collections = (
            GroupCollection.objects
            .filter(application=application)
            .prefetch_related(
                "allocations__member_installment__membership__customer"
            )
            .order_by("-created_at")
        )

        return Response({
            "application_id": application.id,
            "group_name": application.group.name,
            "member_installments":
                GroupLoanMemberInstallmentSerializer(
                    member_installments,
                    many=True,
                ).data,
            "collections": GroupCollectionSerializer(
                collections,
                many=True,
            ).data,
        })

    @transaction.atomic
    def post(self, request, application_id):
        application = get_object_or_404(
            GroupLoanApplication.objects.select_for_update(),
            pk=application_id,
        )

        if application.status != "disbursed":
            raise ValidationError(
                "Collection is allowed only after loan disbursement."
            )

        allocations_data = request.data.get("allocations")

        if not isinstance(allocations_data, list) or not allocations_data:
            raise ValidationError({
                "allocations": "At least one member payment is required."
            })

        try:
            total_amount = money(request.data.get("amount", "0"))
        except Exception:
            raise ValidationError("Enter a valid collection amount.")

        if total_amount <= 0:
            raise ValidationError("Collection amount must be greater than zero.")

        payment_method = request.data.get("payment_method", "cash")
        allowed_methods = ["cash", "upi", "bank", "other"]

        if payment_method not in allowed_methods:
            raise ValidationError({
                "payment_method": "Choose cash, upi, bank or other."
            })

        payment_date = parse_date(
            request.data.get("payment_date", date.today().isoformat())
        )

        if not payment_date:
            raise ValidationError({
                "payment_date": "Use YYYY-MM-DD format."
            })

        # Validate every member allocation before saving.
        parsed_allocations = []
        allocation_total = Decimal("0.00")
        seen_ids = set()

        for item in allocations_data:
            member_installment_id = item.get("member_installment")

            if not member_installment_id:
                raise ValidationError(
                    "Every allocation needs member_installment ID."
                )

            if member_installment_id in seen_ids:
                raise ValidationError(
                    "Duplicate member installment in allocations."
                )

            seen_ids.add(member_installment_id)

            try:
                amount = money(item.get("amount", "0"))
            except Exception:
                raise ValidationError(
                    "Enter a valid amount for every member."
                )

            if amount <= 0:
                raise ValidationError(
                    "Member allocation must be greater than zero."
                )

            member_emi = get_object_or_404(
                GroupLoanMemberInstallment.objects
                .select_for_update()
                .select_related("installment"),
                pk=member_installment_id,
                installment__application=application,
            )

            balance = member_emi.balance_due

            if amount > balance:
                raise ValidationError({
                    "member_installment": (
                        f"Payment exceeds balance for "
                        f"{member_emi.membership.customer}. "
                        f"Available balance: {balance}"
                    )
                })

            parsed_allocations.append((member_emi, amount))
            allocation_total += amount

        allocation_total = money(allocation_total)

        if allocation_total != total_amount:
            raise ValidationError({
                "amount": (
                    f"Collection amount ({total_amount}) must equal "
                    f"total member allocations ({allocation_total})."
                )
            })

        # Create one group-level receipt.
        collection = GroupCollection.objects.create(
            application=application,
            amount=total_amount,
            payment_method=payment_method,
            payment_date=payment_date,
            reference=request.data.get("reference", ""),
            notes=request.data.get("notes", ""),
            created_by=request.user if request.user.is_authenticated else None,
        )

        affected_installment_ids = set()

        # Save individual member allocations.
        for member_emi, amount in parsed_allocations:
            GroupCollectionAllocation.objects.create(
                collection=collection,
                member_installment=member_emi,
                amount=amount,
            )

            member_emi.paid_amount = money(
                member_emi.paid_amount + amount
            )

            if member_emi.paid_amount >= member_emi.total_due:
                member_emi.status = "paid"
            else:
                member_emi.status = "partial"

            member_emi.save(
                update_fields=["paid_amount", "status"]
            )

            affected_installment_ids.add(member_emi.installment_id)

        # Update group-level EMI totals from member allocations.
        for installment_id in affected_installment_ids:
            group_installment = (
                GroupLoanInstallment.objects
                .select_for_update()
                .get(pk=installment_id)
            )

            member_paid_total = (
                GroupLoanMemberInstallment.objects
                .filter(installment=group_installment)
                .aggregate(total=Sum("paid_amount"))["total"]
                or Decimal("0.00")
            )

            group_installment.paid_amount = money(member_paid_total)

            if group_installment.paid_amount >= group_installment.total_due:
                group_installment.status = "paid"
            elif group_installment.paid_amount > 0:
                group_installment.status = "partial"
            elif group_installment.due_date < date.today():
                group_installment.status = "overdue"
            else:
                group_installment.status = "pending"

            group_installment.save(
                update_fields=["paid_amount", "status"]
            )

        collection = (
            GroupCollection.objects
            .prefetch_related("allocations__member_installment__membership__customer")
            .get(pk=collection.pk)
        )

        return Response({
            "detail": "Group collection saved successfully.",
            "receipt": GroupCollectionSerializer(collection).data,
        }, status=status.HTTP_201_CREATED)
