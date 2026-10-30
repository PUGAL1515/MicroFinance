
import os
import django
from decimal import Decimal, ROUND_DOWN

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from django.utils import timezone
from loans.models import (
    GroupLoanApplication,
    GroupLoanInstallment,
    GroupLoanMemberInstallment,
)

APPLICATION_ID = 1


def split_amount(amount, count):
    amount = Decimal(str(amount or 0)).quantize(Decimal("0.01"))
    share = (amount / count).quantize(
        Decimal("0.01"),
        rounding=ROUND_DOWN
    )
    parts = [share] * (count - 1)
    parts.append(amount - sum(parts))
    return parts


app = GroupLoanApplication.objects.get(id=APPLICATION_ID)

installments = list(
    GroupLoanInstallment.objects
    .filter(application=app)
    .order_by("installment_number")
)

members = list(
    app.group.memberships
    .filter(is_active=True)
    .order_by("id")
)

if not members:
    raise Exception("No active members found.")

existing = GroupLoanMemberInstallment.objects.filter(
    installment__application=app
).count()

if existing:
    raise Exception(
        f"Stopped: {existing} member installments already exist."
    )

created = 0

with transaction.atomic():
    for inst in installments:
        principal_parts = split_amount(
            inst.principal_due, len(members)
        )
        interest_parts = split_amount(
            inst.interest_due, len(members)
        )
        paid_parts = split_amount(
            min(
                Decimal(str(inst.paid_amount or 0)),
                Decimal(str(inst.total_due or 0))
            ),
            len(members)
        )

        for index, member in enumerate(members):
            principal = principal_parts[index]
            interest = interest_parts[index]
            total = principal + interest
            paid = min(paid_parts[index], total)
            balance = total - paid

            if balance <= 0:
                status = "paid"
            elif paid > 0:
                status = "partial"
            elif inst.due_date < timezone.localdate():
                status = "overdue"
            else:
                status = "pending"

            GroupLoanMemberInstallment.objects.create(
                installment=inst,
                membership=member,
                principal_due=principal,
                interest_due=interest,
                total_due=total,
                paid_amount=paid,
                status=status,
            )

            created += 1

print("Application:", app.id)
print("Group installments:", len(installments))
print("Active members:", len(members))
print("Created member installments:", created)

print(
    "Database total:",
    GroupLoanMemberInstallment.objects.filter(
        installment__application=app
    ).count()
)
