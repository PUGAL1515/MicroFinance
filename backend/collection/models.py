
from django.db import models
from django.conf import settings

from loans.models import GroupLoanMemberInstallment


class CollectionFollowUp(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("contacted", "Contacted"),
        ("promised", "Payment Promised"),
        ("unreachable", "Unreachable"),
        ("paid", "Paid"),
    ]

    member_installment = models.ForeignKey(
        GroupLoanMemberInstallment,
        on_delete=models.PROTECT,
        related_name="follow_ups",
    )

    follow_up_date = models.DateField()
    next_follow_up_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default="pending",
    )

    remarks = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collection_follow_ups",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-follow_up_date", "-created_at"]

    def __str__(self):
        return (
            f"{self.member_installment} - "
            f"{self.status}"
        )
