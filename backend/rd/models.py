from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from customer.models import Customer   # adjust if app name is different


class RDProduct(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    INTEREST_SIMPLE = "SIMPLE"
    INTEREST_COMPOUND = "COMPOUND"
    INTEREST_TYPE_CHOICES = [
        (INTEREST_SIMPLE, "Simple Interest"),
        (INTEREST_COMPOUND, "Compound Interest"),
    ]

    COMPOUNDING_CHOICES = [
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly"),
        ("YEARLY", "Yearly"),
    ]

    FREQUENCY_CHOICES = [
        ("MONTHLY", "Monthly"),
    ]

    # A. Basic details
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    min_instalment = models.DecimalField(max_digits=12, decimal_places=2)
    max_instalment = models.DecimalField(max_digits=12, decimal_places=2)
    min_tenure_months = models.PositiveIntegerField()
    max_tenure_months = models.PositiveIntegerField()
    instalment_frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default="MONTHLY")
    monthly_due_day = models.PositiveSmallIntegerField(default=5)  # e.g. 5th of every month
    effective_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)

    # C. Interest
    interest_type = models.CharField(max_length=20, choices=INTEREST_TYPE_CHOICES, default=INTEREST_COMPOUND)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # annual %
    compounding_frequency = models.CharField(max_length=20, choices=COMPOUNDING_CHOICES, default="QUARTERLY")

    # B. Collection rules
    grace_period_days = models.PositiveIntegerField(default=5)
    late_fee_type = models.CharField(
        max_length=20,
        choices=[("FLAT", "Flat"), ("PERCENT", "Percent of Instalment")],
        default="FLAT",
    )
    late_fee_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Controls
    premature_allowed = models.BooleanField(default=True)
    lock_in_months = models.PositiveIntegerField(default=0)
    maker_checker_required = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="rd_products_created")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class RDAccount(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending Approval"),
        ("ACTIVE", "Active"),
        ("MATURED", "Matured"),
        ("CLOSED", "Closed"),
        ("PREMATURE_CLOSED", "Premature Closed"),
    ]

    product = models.ForeignKey(RDProduct, on_delete=models.PROTECT, related_name="accounts")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="rd_accounts")
    account_number = models.CharField(max_length=30, unique=True)

    monthly_instalment = models.DecimalField(max_digits=12, decimal_places=2)
    tenure_months = models.PositiveIntegerField()
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # locked
    start_date = models.DateField()
    maturity_date = models.DateField()
    expected_maturity_amount = models.DecimalField(max_digits=14, decimal_places=2)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    total_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_instalments_paid = models.PositiveIntegerField(default=0)

    nominee_name = models.CharField(max_length=150, blank=True)
    nominee_relation = models.CharField(max_length=50, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="rd_created")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="rd_approved")
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.account_number} - {self.customer.get_full_name()}"


class RDInstalment(models.Model):
    STATUS_CHOICES = [
        ("DUE", "Due"),
        ("PAID", "Paid"),
        ("PARTIAL", "Partial"),
        ("OVERDUE", "Overdue"),
        ("WAIVED", "Waived"),
    ]

    rd_account = models.ForeignKey(RDAccount, on_delete=models.CASCADE, related_name="instalments")
    instalment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DUE")
    paid_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["instalment_number"]
        unique_together = ("rd_account", "instalment_number")

    def __str__(self):
        return f"{self.rd_account.account_number} - Inst #{self.instalment_number}"


class RDCollection(models.Model):
    PAYMENT_MODE_CHOICES = [
        ("CASH", "Cash"),
        ("BANK", "Bank Transfer"),
        ("UPI", "UPI"),
        ("CARD", "Card"),
        ("OTHER", "Other"),
    ]

    instalment = models.ForeignKey(RDInstalment, on_delete=models.CASCADE, related_name="collections")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default="CASH")
    receipt_number = models.CharField(max_length=30, unique=True)
    collection_date = models.DateField()
    remarks = models.TextField(blank=True)
    collected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="rd_reversals"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.receipt_number} - {self.amount}"