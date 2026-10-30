from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class FDProduct(models.Model):
    INTEREST_SIMPLE = "SIMPLE"
    INTEREST_COMPOUND = "COMPOUND"
    INTEREST_TYPE_CHOICES = [
        (INTEREST_SIMPLE, "Simple Interest"),
        (INTEREST_COMPOUND, "Compound Interest"),
    ]

    COMPOUNDING_CHOICES = [
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly"),
        ("HALF_YEARLY", "Half Yearly"),
        ("YEARLY", "Yearly"),
    ]

    PAYOUT_CHOICES = [
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly"),
        ("AT_MATURITY", "At Maturity"),
    ]

    TENURE_UNIT_CHOICES = [
        ("DAYS", "Days"),
        ("MONTHS", "Months"),
        ("YEARS", "Years"),
    ]

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    # A. Basic Details
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    effective_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    min_amount = models.DecimalField(max_digits=12, decimal_places=2)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_senior_citizen = models.BooleanField(default=False)
    senior_extra_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # B. Interest Options
    interest_type = models.CharField(max_length=20, choices=INTEREST_TYPE_CHOICES, default=INTEREST_COMPOUND)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # Annual %
    compounding_frequency = models.CharField(max_length=20, choices=COMPOUNDING_CHOICES, default="QUARTERLY")
    payout_frequency = models.CharField(max_length=20, choices=PAYOUT_CHOICES, default="AT_MATURITY")

    # C. Tenure
    tenure_unit = models.CharField(max_length=10, choices=TENURE_UNIT_CHOICES, default="MONTHS")
    min_tenure = models.PositiveIntegerField()
    max_tenure = models.PositiveIntegerField()

    # D. Maturity Instructions (default)
    MATURITY_CHOICES = [
        ("PAY_PRINCIPAL_INTEREST", "Pay Principal + Interest"),
        ("RENEW_PRINCIPAL", "Renew Principal Only"),
        ("RENEW_PRINCIPAL_INTEREST", "Renew Principal + Interest"),
        ("TRANSFER", "Transfer to Account"),
    ]
    default_maturity_instruction = models.CharField(
        max_length=30, choices=MATURITY_CHOICES, default="PAY_PRINCIPAL_INTEREST"
    )

    # E. Risk & Controls
    premature_allowed = models.BooleanField(default=True)
    lock_in_days = models.PositiveIntegerField(default=0)  # no premature before this
    penalty_type = models.CharField(
        max_length=20,
        choices=[("PERCENT_INTEREST", "% of Interest"), ("PERCENT_PRINCIPAL", "% of Principal"), ("FLAT", "Flat Amount")],
        default="PERCENT_INTEREST"
    )
    penalty_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    maker_checker_required = models.BooleanField(default=False)
    approval_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # above this needs approval
    nominee_required = models.BooleanField(default=True)
    tds_applicable = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="fd_products_created")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class FDAccount(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending Approval"),
        ("ACTIVE", "Active"),
        ("MATURED", "Matured"),
        ("CLOSED", "Closed"),
        ("PREMATURE_CLOSED", "Premature Closed"),
    ]

    product = models.ForeignKey(FDProduct, on_delete=models.PROTECT, related_name="accounts")
    account_number = models.CharField(max_length=30, unique=True)
    
    # Customer details (you can later link to Customer model)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=15, blank=True)
    customer_id_proof = models.CharField(max_length=50, blank=True)

    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tenure_value = models.PositiveIntegerField()  # based on product.tenure_unit
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # locked at opening
    start_date = models.DateField()
    maturity_date = models.DateField()
    maturity_amount = models.DecimalField(max_digits=14, decimal_places=2)

    maturity_instruction = models.CharField(max_length=30, choices=FDProduct.MATURITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")

    # Nominee
    nominee_name = models.CharField(max_length=150, blank=True)
    nominee_relation = models.CharField(max_length=50, blank=True)

    # Approval
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="fd_created")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="fd_approved")
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.account_number} - {self.customer_name}"


class FDTransaction(models.Model):
    TRANSACTION_TYPES = [
        ("DEPOSIT", "Initial Deposit"),
        ("INTEREST_PAYOUT", "Interest Payout"),
        ("MATURITY_PAYOUT", "Maturity Payout"),
        ("PREMATURE_CLOSURE", "Premature Closure"),
        ("RENEWAL", "Renewal"),
    ]

    fd_account = models.ForeignKey(FDAccount, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_date = models.DateField()
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.fd_account.account_number} - {self.transaction_type}"