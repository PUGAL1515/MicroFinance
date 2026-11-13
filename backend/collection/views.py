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