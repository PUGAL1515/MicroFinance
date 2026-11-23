from decimal import Decimal

from django.db.models import Sum, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from notifications.utils import notify_user
from loans.models import (
    GroupLoanMemberInstallment,
    GroupCollection,
)

from .models import CollectionFollowUp
from .serializers import (
    TodayDueSerializer,
    FieldCollectionSerializer,
    PaymentHistorySerializer,
    ReceiptSerializer,
    FollowUpSerializer,
)
from .filters import (
    get_today_due_queryset,
    get_overdue_queryset,
    get_payment_queryset,
    filter_member_installments,
)
from .services import (
    get_balance,
    record_field_collection,
)

User = get_user_model()


def get_admins(roles=None):
    if roles is None:
        roles = ["SUPER_ADMIN", "GROUP_LOAN_ADMIN", "BRANCH_MANAGER"]
    return User.objects.filter(profile__role__in=roles)


class CollectionDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.localdate()

        today_dues = get_today_due_queryset()
        overdue = get_overdue_queryset()

        today_due_amount = sum(
            (get_balance(item) for item in today_dues),
            Decimal("0.00"),
        )

        overdue_amount = sum(
            (get_balance(item) for item in overdue),
            Decimal("0.00"),
        )

        today_collections = GroupCollection.objects.filter(
            payment_date=today
        )

        collected = today_collections.aggregate(
            total=Sum("amount"),
            count=Count("id"),
        )

        return Response({
            "date": today,
            "today_due_count": today_dues.count(),
            "today_due_amount": today_due_amount,
            "collected_count": collected["count"] or 0,
            "collected_amount": collected["total"] or Decimal("0.00"),
            "pending_amount": max(
                Decimal("0.00"),
                today_due_amount - (
                    collected["total"] or Decimal("0.00")
                ),
            ),
            "overdue_count": overdue.count(),
            "overdue_amount": overdue_amount,
        })


class TodayDuesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = get_today_due_queryset()

        queryset = filter_member_installments(
            queryset,
            request.query_params,
        )

        serializer = TodayDueSerializer(
            queryset,
            many=True,
        )

        return Response({
            "count": queryset.count(),
            "results": serializer.data,
        })


class FieldCollectionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = FieldCollectionSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        try:
            collection = record_field_collection(
                application_id=data["application_id"],
                allocations=data["allocations"],
                payment_method=data["payment_method"],
                payment_date=data["payment_date"],
                reference=data.get("reference", ""),
                notes=data.get("notes", ""),
                created_by=request.user,
            )

        except GroupLoanMemberInstallment.DoesNotExist:
            return Response(
                {"detail": "EMI installment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ========== NOTIFICATION ==========
        amount = getattr(collection, "amount", None) or ""
        receipt = getattr(collection, "receipt_number", "")

        for admin in get_admins(
            ["SUPER_ADMIN", "GROUP_LOAN_ADMIN", "BRANCH_MANAGER"]
        ):
            notify_user(
                user=admin,
                title="Field Collection Recorded",
                message=f"₹{amount} collected (Receipt: {receipt})",
                level="success",
                link="/collections",
            )
        # ==================================

        return Response(
            {
                "message": "Collection recorded successfully.",
                "receipt_number": collection.receipt_number,
                "collection": ReceiptSerializer(
                    collection
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = get_payment_queryset()

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        payment_method = request.query_params.get("payment_method")
        branch_id = request.query_params.get("branch_id")

        if date_from:
            queryset = queryset.filter(
                payment_date__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                payment_date__lte=date_to
            )

        if payment_method:
            queryset = queryset.filter(
                payment_method=payment_method
            )

        if branch_id:
            queryset = queryset.filter(
                application__group__branch_id=branch_id
            )

        serializer = PaymentHistorySerializer(
            queryset,
            many=True,
        )

        return Response({
            "count": queryset.count(),
            "results": serializer.data,
        })


class ReceiptDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        collection = get_object_or_404(
            GroupCollection.objects.select_related(
                "application__group",
                "created_by",
            ).prefetch_related(
                "allocations__member_installment__membership__customer",
                "allocations__member_installment__installment",
            ),
            pk=pk,
        )

        return Response(
            ReceiptSerializer(collection).data
        )


class OverdueListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = get_overdue_queryset()

        branch_id = request.query_params.get("branch_id")

        if branch_id:
            queryset = queryset.filter(
                membership__group__branch_id=branch_id
            )

        serializer = TodayDueSerializer(
            queryset,
            many=True,
        )

        results = []

        today = timezone.localdate()

        for item, data in zip(queryset, serializer.data):
            row = dict(data)
            row["overdue_days"] = (
                today - item.installment.due_date
            ).days
            results.append(row)

        total_overdue = sum(
            (get_balance(item) for item in queryset),
            Decimal("0.00"),
        )

        return Response({
            "count": len(results),
            "total_overdue": total_overdue,
            "results": results,
        })


class FollowUpView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            CollectionFollowUp.objects
            .select_related(
                "member_installment__membership__customer",
                "member_installment__installment",
            )
        )

        follow_up_date = request.query_params.get("date")
        follow_up_status = request.query_params.get("status")

        if follow_up_date:
            queryset = queryset.filter(
                follow_up_date=follow_up_date
            )

        if follow_up_status:
            queryset = queryset.filter(
                status=follow_up_status
            )

        serializer = FollowUpSerializer(
            queryset,
            many=True,
        )

        return Response({
            "count": queryset.count(),
            "results": serializer.data,
        })

    def post(self, request):
        serializer = FollowUpSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        follow_up = serializer.save(created_by=request.user)

        # ========== NOTIFICATION ==========
        for admin in get_admins(
            ["SUPER_ADMIN", "GROUP_LOAN_ADMIN", "BRANCH_MANAGER"]
        ):
            notify_user(
                user=admin,
                title="Collection Follow-up Created",
                message=f"New follow-up scheduled for {getattr(follow_up, 'follow_up_date', '')}",
                level="info",
                link="/collections",
            )
        # ==================================

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny  # change later to IsAuthenticated

from fd.models import FDAccount, FDTransaction   # adjust app name if different
from rd.models import RDAccount, RDCollection   # adjust app name if different


class FDRDSummaryView(APIView):
    """
    Summary cards for FD + RD
    GET /api/reports/fd-rd/summary/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.localdate()

        # ---------- FD ----------
        fd_qs = FDAccount.objects.all()

        fd_active = fd_qs.filter(status="ACTIVE")
        fd_matured = fd_qs.filter(status="MATURED")
        fd_premature = fd_qs.filter(status="PREMATURE_CLOSED")
        fd_closed = fd_qs.filter(status="CLOSED")

        fd_active_amount = fd_active.aggregate(total=Sum("deposit_amount"))["total"] or Decimal("0")
        fd_matured_amount = fd_matured.aggregate(total=Sum("maturity_amount"))["total"] or Decimal("0")
        fd_premature_amount = fd_premature.aggregate(total=Sum("deposit_amount"))["total"] or Decimal("0")

        # ---------- RD ----------
        rd_qs = RDAccount.objects.all()

        rd_active = rd_qs.filter(status="ACTIVE")
        rd_matured = rd_qs.filter(status="MATURED")
        rd_premature = rd_qs.filter(status="PREMATURE_CLOSED")
        rd_closed = rd_qs.filter(status="CLOSED")

        rd_active_amount = rd_active.aggregate(total=Sum("total_paid"))["total"] or Decimal("0")
        rd_matured_amount = rd_matured.aggregate(total=Sum("expected_maturity_amount"))["total"] or Decimal("0")
        rd_premature_amount = rd_premature.aggregate(total=Sum("total_paid"))["total"] or Decimal("0")

        return Response({
            "date": today,
            "fd": {
                "active_count": fd_active.count(),
                "active_amount": fd_active_amount,
                "matured_count": fd_matured.count(),
                "matured_amount": fd_matured_amount,
                "premature_count": fd_premature.count(),
                "premature_amount": fd_premature_amount,
                "closed_count": fd_closed.count(),
            },
            "rd": {
                "active_count": rd_active.count(),
                "active_amount": rd_active_amount,
                "matured_count": rd_matured.count(),
                "matured_amount": rd_matured_amount,
                "premature_count": rd_premature.count(),
                "premature_amount": rd_premature_amount,
                "closed_count": rd_closed.count(),
            },
            "combined": {
                "active_count": fd_active.count() + rd_active.count(),
                "active_amount": fd_active_amount + rd_active_amount,
                "matured_count": fd_matured.count() + rd_matured.count(),
                "premature_count": fd_premature.count() + rd_premature.count(),
            }
        })


class FDAccountListView(APIView):
    """
    List FD accounts with filters
    GET /api/reports/fd-rd/fd-accounts/?status=ACTIVE&date_from=...&date_to=...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = FDAccount.objects.select_related("product", "customer", "created_by").all()

        status_param = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        search = request.query_params.get("search", "").strip()

        if status_param:
            qs = qs.filter(status=status_param.upper())

        if date_from:
            qs = qs.filter(start_date__gte=date_from)
        if date_to:
            qs = qs.filter(start_date__lte=date_to)

        if search:
            qs = qs.filter(
                Q(account_number__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer__full_name__icontains=search)  # if you have full_name
            )

        data = []
        for acc in qs.order_by("-created_at")[:500]:  # limit for safety
            customer_name = "—"
            if acc.customer:
                customer_name = getattr(acc.customer, "get_full_name", lambda: None)() or \
                                f"{getattr(acc.customer, 'first_name', '')} {getattr(acc.customer, 'last_name', '')}".strip() or \
                                str(acc.customer)

            data.append({
                "id": acc.id,
                "account_number": acc.account_number,
                "customer": customer_name,
                "product": acc.product.name if acc.product else "—",
                "deposit_amount": acc.deposit_amount,
                "interest_rate": acc.interest_rate,
                "start_date": acc.start_date,
                "maturity_date": acc.maturity_date,
                "maturity_amount": acc.maturity_amount,
                "status": acc.status,
                "tenure_value": acc.tenure_value,
            })

        return Response({
            "count": len(data),
            "results": data,
        })


class RDAccountListView(APIView):
    """
    List RD accounts with filters
    GET /api/reports/fd-rd/rd-accounts/?status=ACTIVE&date_from=...&date_to=...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = RDAccount.objects.select_related("product", "customer", "created_by").all()

        status_param = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        search = request.query_params.get("search", "").strip()

        if status_param:
            qs = qs.filter(status=status_param.upper())

        if date_from:
            qs = qs.filter(start_date__gte=date_from)
        if date_to:
            qs = qs.filter(start_date__lte=date_to)

        if search:
            qs = qs.filter(
                Q(account_number__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search)
            )

        data = []
        for acc in qs.order_by("-created_at")[:500]:
            customer_name = "—"
            if acc.customer:
                customer_name = getattr(acc.customer, "get_full_name", lambda: None)() or \
                                f"{getattr(acc.customer, 'first_name', '')} {getattr(acc.customer, 'last_name', '')}".strip() or \
                                str(acc.customer)

            data.append({
                "id": acc.id,
                "account_number": acc.account_number,
                "customer": customer_name,
                "product": acc.product.name if acc.product else "—",
                "monthly_instalment": acc.monthly_instalment,
                "tenure_months": acc.tenure_months,
                "interest_rate": acc.interest_rate,
                "start_date": acc.start_date,
                "maturity_date": acc.maturity_date,
                "expected_maturity_amount": acc.expected_maturity_amount,
                "total_paid": acc.total_paid,
                "total_instalments_paid": acc.total_instalments_paid,
                "status": acc.status,
            })

        return Response({
            "count": len(data),
            "results": data,
        })


class RDCollectionReportView(APIView):
    """
    RD Collection report (payments received)
    GET /api/reports/fd-rd/rd-collections/?date_from=...&date_to=...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = RDCollection.objects.filter(is_reversed=False).select_related(
            "instalment__rd_account__customer",
            "collected_by"
        )

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if date_from:
            qs = qs.filter(collection_date__gte=date_from)
        if date_to:
            qs = qs.filter(collection_date__lte=date_to)

        total = qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")

        data = []
        for col in qs.order_by("-collection_date")[:500]:
            customer = "—"
            if col.instalment and col.instalment.rd_account and col.instalment.rd_account.customer:
                c = col.instalment.rd_account.customer
                customer = getattr(c, "get_full_name", lambda: None)() or str(c)

            data.append({
                "receipt_number": col.receipt_number,
                "customer": customer,
                "account_number": col.instalment.rd_account.account_number if col.instalment else "—",
                "amount": col.amount,
                "payment_mode": col.payment_mode,
                "collection_date": col.collection_date,
                "collected_by": str(col.collected_by) if col.collected_by else "—",
            })

        return Response({
            "count": len(data),
            "total_collected": total,
            "results": data,
        })        