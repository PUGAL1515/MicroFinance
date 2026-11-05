
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from loans.models import (
    GroupLoanApplication,
    GroupLoanInstallment,
    GroupLoanMemberInstallment,
    GroupCollection,
    GroupCollectionAllocation,
)


MONEY = Decimal("0.01")


def money(value):
    return Decimal(str(value or 0)).quantize(
        MONEY,
        rounding=ROUND_HALF_UP,
    )


def get_balance(installment):
    return max(
        Decimal("0.00"),
        money(installment.total_due)
        - money(installment.paid_amount),
    )


def update_installment_status(installment, today=None):
    today = today or timezone.localdate()
    balance = get_balance(installment)

    if balance <= 0:
        installment.status = "paid"
    elif installment.paid_amount > 0:
        installment.status = "partial"
    elif installment.due_date < today:
        installment.status = "overdue"
    else:
        installment.status = "pending"

    installment.save(update_fields=["status"])
    return installment


def sync_group_installment(group_installment, today=None):
    member_totals = (
        GroupLoanMemberInstallment.objects.filter(
            installment=group_installment
        ).aggregate(total=Sum("paid_amount"))
    )

    group_installment.paid_amount = money(
        member_totals["total"]
    )

    balance = (
        money(group_installment.total_due)
        - money(group_installment.paid_amount)
    )

    if balance <= 0:
        group_installment.status = "paid"
    elif group_installment.paid_amount > 0:
        group_installment.status = "partial"
    elif group_installment.due_date < (
        today or timezone.localdate()
    ):
        group_installment.status = "overdue"
    else:
        group_installment.status = "pending"

    group_installment.save(
        update_fields=["paid_amount", "status"]
    )


def close_application_if_paid(application):
    installments = list(
        GroupLoanInstallment.objects.filter(
            application=application
        )
    )

    if not installments:
        return False

    all_paid = all(
        money(item.paid_amount) >= money(item.total_due)
        for item in installments
    )

    if all_paid:
        application.status = "closed"
        application.save(update_fields=["status"])
        return True

    return False


@transaction.atomic
def record_field_collection(
    application_id,
    allocations,
    payment_method,
    payment_date,
    reference="",
    notes="",
    created_by=None,
):
    application = (
        GroupLoanApplication.objects
        .select_for_update()
        .get(pk=application_id)
    )

    if application.status != "disbursed":
        raise ValueError(
            "Only disbursed group loans can receive collections."
        )

    if not allocations:
        raise ValueError("At least one EMI allocation is required.")

    total_amount = Decimal("0.00")
    locked_installments = []

    for item in allocations:
        installment_id = item["member_installment_id"]
        amount = money(item["amount"])

        if amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        member_installment = (
            GroupLoanMemberInstallment.objects
            .select_for_update()
            .select_related(
                "installment",
                "membership",
                "membership__group",
            )
            .get(
                pk=installment_id,
                installment__application=application,
                membership__is_active=True,
            )
        )

        balance = get_balance(member_installment)

        if amount > balance:
            raise ValueError(
                f"Payment exceeds outstanding balance for "
                f"member EMI {member_installment.pk}. "
                f"Balance: {balance}"
            )

        total_amount += amount

        locked_installments.append(
            (member_installment, amount)
        )

    if total_amount <= 0:
        raise ValueError("Invalid collection amount.")

    collection = GroupCollection.objects.create(
        application=application,
        amount=money(total_amount),
        payment_method=payment_method,
        payment_date=payment_date,
        reference=reference,
        notes=notes,
        created_by=created_by,
    )

    affected_group_installments = {}

    for member_installment, amount in locked_installments:
        member_installment.paid_amount = money(
            member_installment.paid_amount + amount
        )

        update_installment_status(member_installment)

        GroupCollectionAllocation.objects.create(
            collection=collection,
            member_installment=member_installment,
            amount=amount,
        )

        affected_group_installments[
            member_installment.installment_id
        ] = member_installment.installment

    for group_installment in affected_group_installments.values():
        sync_group_installment(group_installment)

    close_application_if_paid(application)

    return collection
