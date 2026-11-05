
from django.utils import timezone

from loans.models import (
    GroupLoanMemberInstallment,
    GroupCollection,
)


def filter_member_installments(queryset, params):
    due_date = params.get("date")
    branch_id = params.get("branch_id")
    staff_id = params.get("staff_id")

    if due_date:
        queryset = queryset.filter(
            installment__due_date=due_date
        )

    if branch_id:
        queryset = queryset.filter(
            membership__group__branch_id=branch_id
        )

    if staff_id:
        queryset = queryset.filter(
            installment__application__collections__created_by_id=staff_id
        ).distinct()

    return queryset


def get_today_due_queryset():
    today = timezone.localdate()

    return (
        GroupLoanMemberInstallment.objects
        .select_related(
            "membership__customer",
            "membership__group",
            "installment__application",
        )
        .filter(
            installment__due_date=today,
            installment__application__status="disbursed",
            membership__is_active=True,
        )
        .exclude(status="paid")
        .order_by("installment__due_date", "id")
    )


def get_overdue_queryset():
    today = timezone.localdate()

    return (
        GroupLoanMemberInstallment.objects
        .select_related(
            "membership__customer",
            "membership__group",
            "installment__application",
        )
        .filter(
            installment__due_date__lt=today,
            installment__application__status="disbursed",
            membership__is_active=True,
        )
        .exclude(status="paid")
        .order_by("installment__due_date")
    )


def get_payment_queryset():
    return (
        GroupCollection.objects
        .select_related(
            "application__group",
            "created_by",
        )
        .prefetch_related(
            "allocations__member_installment__membership__customer"
        )
        .order_by("-payment_date", "-created_at")
    )
