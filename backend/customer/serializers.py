
from datetime import date
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import (
    Customer,
    CustomerKYC,
    LoanApplication,
    Loan,
    EMISchedule,
    Collection,
)


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_age(self, obj):
        return obj.get_age()

    def validate_date_of_birth(self, value):
        if value > date.today():
            raise serializers.ValidationError(
                "Date of birth cannot be in the future."
            )
        return value

    def validate_monthly_income(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Income cannot be negative."
            )
        return value


class CustomerKYCSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerKYC
        fields = "__all__"
        read_only_fields = [
            "id", "status", "verified_by",
            "verified_at", "created_at",
        ]


class KYCVerificationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["verified", "rejected"]
    )
    verification_notes = serializers.CharField(
        required=False, allow_blank=True
    )


class LoanApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanApplication
        fields = "__all__"
        read_only_fields = [
            "id", "application_number", "status",
            "rejection_reason", "created_at", "updated_at",
        ]

    def validate(self, attrs):
        customer = attrs.get(
            "customer",
            getattr(self.instance, "customer", None),
        )
        loan_type = attrs.get(
            "loan_type",
            getattr(self.instance, "loan_type", None),
        )
        group_name = attrs.get(
            "group_name",
            getattr(self.instance, "group_name", ""),
        )

        if customer and not customer.is_active:
            raise serializers.ValidationError(
                "Inactive customers cannot apply for a loan."
            )

        if loan_type == "group" and not group_name.strip():
            raise serializers.ValidationError({
                "group_name": "Group name is required for a group loan."
            })

        if self.instance and self.instance.status in [
            "approved", "rejected"
        ]:
            raise serializers.ValidationError(
                "A finalized application cannot be edited."
            )

        return attrs


class LoanSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="application.customer.get_full_name",
        read_only=True,
    )
    application_number = serializers.CharField(
        source="application.application_number",
        read_only=True,
    )

    class Meta:
        model = Loan
        fields = "__all__"
        read_only_fields = [
            "id", "application", "approved_at", "disbursed_at",
        ]


class EMIScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EMISchedule
        fields = "__all__"
        read_only_fields = ["id", "amount_paid", "status"]


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = "__all__"
        read_only_fields = ["id", "receipt_number", "created_at"]

    def validate(self, attrs):
        installment = attrs["installment"]
        amount = attrs["amount"]

        if installment.loan.status != "disbursed":
            raise serializers.ValidationError(
                "Collections are allowed only for disbursed loans."
            )

        outstanding = installment.amount_due - installment.amount_paid

        if amount > outstanding:
            raise serializers.ValidationError({
                "amount": f"Payment exceeds installment balance ({outstanding})."
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        installment = (
            EMISchedule.objects.select_for_update()
            .get(pk=validated_data["installment"].pk)
        )

        amount = validated_data["amount"]
        outstanding = installment.amount_due - installment.amount_paid

        if amount > outstanding:
            raise serializers.ValidationError({
                "amount": "Payment exceeds the remaining installment balance."
            })

        # Generate a receipt reference on the server.
        from uuid import uuid4
        validated_data["receipt_number"] = (
            f"RC{uuid4().hex[:12].upper()}"
        )

        collection = Collection.objects.create(**validated_data)

        installment.amount_paid += amount

        if installment.amount_paid >= installment.amount_due:
            installment.status = "paid"
        else:
            installment.status = "partial"

        installment.save(update_fields=["amount_paid", "status"])

        return collection
