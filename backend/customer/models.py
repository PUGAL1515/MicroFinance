
from datetime import date
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
class Customer(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    mobile_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, default="")
    occupation = models.CharField(max_length=100, blank=True)
    monthly_income = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    present_address = models.TextField()
    permanent_address = models.TextField()
    branch_id = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValidationError({
                "date_of_birth": "Date of birth cannot be in the future."
            })
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    def get_age(self):
        today = date.today()
        return (
            today.year - self.date_of_birth.year
            - ((today.month, today.day) <
               (self.date_of_birth.month, self.date_of_birth.day))
        )
    def __str__(self):
        return self.get_full_name()
class CustomerKYC(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]
    DOCUMENT_CHOICES = [
        ("identity", "Identity Proof"),
        ("address", "Address Proof"),
        ("photo", "Photograph"),
        ("other", "Other"),
    ]
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="kyc_documents",
    )
    document_type = models.CharField(
        max_length=20, choices=DOCUMENT_CHOICES
    )
    document_reference = models.CharField(
        max_length=100, blank=True
    )
    document_file = models.FileField(
        upload_to="private/kyc/",
        blank=True,
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending"
    )
    verification_notes = models.TextField(blank=True)
    verified_by = models.CharField(max_length=150, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.customer} - {self.document_type}"
class LoanApplication(models.Model):
    LOAN_TYPES = [
        ("individual", "Individual"),
        ("group", "Group"),
    ]
    FREQUENCIES = [
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("under_review", "Under Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="loan_applications",
    )
    application_number = models.CharField(
        max_length=30, unique=True
    )
    loan_type = models.CharField(
        max_length=15, choices=LOAN_TYPES
    )
    group_name = models.CharField(max_length=150, blank=True)
    loan_purpose = models.TextField()
    requested_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    annual_interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0")),
            MaxValueValidator(Decimal("100")),
        ],
    )
    tenure_installments = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    repayment_frequency = models.CharField(
        max_length=10, choices=FREQUENCIES
    )
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default="pending"
    )
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.application_number
class Loan(models.Model):
    STATUS_CHOICES = [
        ("approved", "Approved"),
        ("disbursed", "Disbursed"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    ]
    application = models.OneToOneField(
        LoanApplication,
        on_delete=models.PROTECT,
        related_name="loan",
    )
    approved_amount = models.DecimalField(
        max_digits=12, decimal_places=2
    )
    annual_interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2
    )
    tenure_installments = models.PositiveIntegerField()
    repayment_frequency = models.CharField(max_length=10)
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default="approved"
    )
    approved_at = models.DateTimeField(auto_now_add=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    disbursement_reference = models.CharField(
        max_length=100, blank=True
    )
    def __str__(self):
        return f"Loan {self.pk} - {self.application.customer}"
class EMISchedule(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partially Paid"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
    ]
    loan = models.ForeignKey(
        Loan, on_delete=models.PROTECT, related_name="installments"
    )
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    principal_amount = models.DecimalField(
        max_digits=12, decimal_places=2
    )
    interest_amount = models.DecimalField(
        max_digits=12, decimal_places=2
    )
    amount_due = models.DecimalField(
        max_digits=12, decimal_places=2
    )
    amount_paid = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending"
    )
    class Meta:
        ordering = ["due_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["loan", "installment_number"],
                name="unique_loan_installment",
            )
        ]
    def __str__(self):
        return f"Loan {self.loan_id} - EMI {self.installment_number}"
class Collection(models.Model):
    PAYMENT_METHODS = [
        ("cash", "Cash"),
        ("bank", "Bank Transfer"),
        ("upi", "UPI"),
        ("other", "Other"),
    ]
    receipt_number = models.CharField(max_length=30, unique=True)
    installment = models.ForeignKey(
        EMISchedule,
        on_delete=models.PROTECT,
        related_name="collections",
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_method = models.CharField(
        max_length=10, choices=PAYMENT_METHODS
    )
    transaction_reference = models.CharField(
        max_length=100, blank=True
    )
    payment_date = models.DateField(default=date.today)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.receipt_number
