from django.db import models
from customer.models import Customer, CustomerKYC
# Create your models here.
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator,
)

class GroupLoanPlan(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    min_members = models.PositiveIntegerField(default=5)
    max_members = models.PositiveIntegerField(default=10)

    min_loan_per_member = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    max_loan_per_member = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    max_group_loan_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    annual_interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0")),
            MaxValueValidator(Decimal("100")),
        ],
    )

    INTEREST_CHOICES = [
        ("reducing", "Reducing Balance"),
        ("flat", "Flat Rate"),
    ]
    interest_method = models.CharField(
        max_length=10,
        choices=INTEREST_CHOICES,
        default="reducing",
    )

    tenure_months = models.PositiveIntegerField(default=12)

    FREQUENCY_CHOICES = [
        ("weekly", "Weekly"),
        ("fortnightly", "Every 15 Days"),
        ("monthly", "Monthly"),
    ]
    repayment_frequency = models.CharField(
        max_length=12,
        choices=FREQUENCY_CHOICES,
        default="monthly",
    )

    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.min_members > self.max_members:
            raise ValidationError(
                "Minimum members cannot exceed maximum members."
            )

        if self.min_loan_per_member > self.max_loan_per_member:
            raise ValidationError(
                "Minimum loan cannot exceed maximum loan."
            )


class LoanGroup(models.Model):
    name = models.CharField(max_length=150, unique=True)
    group_code = models.CharField(max_length=30, unique=True)

    plan = models.ForeignKey(
        GroupLoanPlan,
        on_delete=models.PROTECT,
        related_name="groups",
    )

    members = models.ManyToManyField(
        Customer,
        through="GroupMembership",
        related_name="loan_groups",
    )

    leader = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="led_loan_groups",
        null=True,
        blank=True,
    )

    branch_id = models.IntegerField(null=True, blank=True)
    meeting_day = models.CharField(max_length=12, blank=True)

    STATUS_CHOICES = [
        ("forming", "Forming"),
        ("pending", "Pending Approval"),
        ("active", "Active"),
        ("closed", "Closed"),
    ]
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="forming",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.group_code} - {self.name}"


class GroupMembership(models.Model):
    group = models.ForeignKey(
        LoanGroup,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="group_memberships",
    )

    is_leader = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "customer"],
                name="unique_group_customer",
            )
        ]

    def __str__(self):
        return f"{self.group.name} - {self.customer}"
    

# Add these imports at the top of the existing group-loan models.py
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.core.exceptions import ValidationError as DjangoValidationError


class GroupLoanApplication(models.Model):
    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("disbursed", "Disbursed"),
        ("closed", "Closed"),
    ]

    group = models.ForeignKey(
        LoanGroup,
        on_delete=models.PROTECT,
        related_name="loan_applications",
    )
    requested_per_member = models.DecimalField(
        max_digits=12, decimal_places=2
    )
    requested_total = models.DecimalField(
        max_digits=14, decimal_places=2
    )
    approved_total = models.DecimalField(
        max_digits=14, decimal_places=2,
        null=True, blank=True,
    )
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2
    )
    interest_method = models.CharField(max_length=10)
    tenure_months = models.PositiveIntegerField()
    repayment_frequency = models.CharField(max_length=12)

    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default="submitted",
    )
    application_notes = models.TextField(blank=True)
    decision_notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Group Loan #{self.pk} - {self.group.name}"


class GroupLoanInstallment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partially Paid"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
    ]

    application = models.ForeignKey(
        GroupLoanApplication,
        on_delete=models.PROTECT,
        related_name="installments",
    )
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    principal_due = models.DecimalField(max_digits=14, decimal_places=2)
    interest_due = models.DecimalField(max_digits=14, decimal_places=2)
    total_due = models.DecimalField(max_digits=14, decimal_places=2)
    paid_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending"
    )

    class Meta:
        ordering = ["installment_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["application", "installment_number"],
                name="unique_group_loan_installment",
            )
        ]

    @property
    def balance_due(self):
        return max(
            Decimal("0.00"),
            self.total_due - self.paid_amount,
        )


class GroupLoanPayment(models.Model):
    installment = models.ForeignKey(
        GroupLoanInstallment,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )
    payment_date = models.DateField(default=date.today)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment #{self.pk} - {self.amount}"

import uuid


class GroupLoanMemberInstallment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partially Paid"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
    ]

    installment = models.ForeignKey(
        GroupLoanInstallment,
        on_delete=models.PROTECT,
        related_name="member_installments",
    )
    membership = models.ForeignKey(
        GroupMembership,
        on_delete=models.PROTECT,
        related_name="loan_installments",
    )

    principal_due = models.DecimalField(max_digits=14, decimal_places=2)
    interest_due = models.DecimalField(max_digits=14, decimal_places=2)
    total_due = models.DecimalField(max_digits=14, decimal_places=2)

    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="pending",
    )

    class Meta:
        ordering = ["installment__installment_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["installment", "membership"],
                name="unique_member_group_installment",
            )
        ]

    @property
    def balance_due(self):
        return max(
            Decimal("0.00"),
            self.total_due - self.paid_amount,
        )

    def __str__(self):
        return (
            f"{self.membership.customer} - "
            f"EMI {self.installment.installment_number}"
        )


class GroupCollection(models.Model):
    PAYMENT_CHOICES = [
        ("cash", "Cash"),
        ("upi", "UPI"),
        ("bank", "Bank Transfer"),
        ("other", "Other"),
    ]

    receipt_number = models.CharField(
        max_length=40,
        unique=True,
        editable=False,
    )

    application = models.ForeignKey(
        GroupLoanApplication,
        on_delete=models.PROTECT,
        related_name="collections",
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)

    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_CHOICES,
        default="cash",
    )

    payment_date = models.DateField(default=date.today)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="group_loan_collections",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            self.receipt_number = f"GR-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.receipt_number} - {self.amount}"


class GroupCollectionAllocation(models.Model):
    collection = models.ForeignKey(
        GroupCollection,
        on_delete=models.PROTECT,
        related_name="allocations",
    )

    member_installment = models.ForeignKey(
        GroupLoanMemberInstallment,
        on_delete=models.PROTECT,
        related_name="allocations",
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"{self.collection.receipt_number} - "
            f"{self.member_installment.membership.customer}"
        )
