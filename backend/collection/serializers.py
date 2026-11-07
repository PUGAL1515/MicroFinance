
from rest_framework import serializers

from loans.models import (
    GroupLoanMemberInstallment,
    GroupCollection,
    GroupCollectionAllocation,
)

from .models import CollectionFollowUp
from .services import get_balance



class TodayDueSerializer(serializers.ModelSerializer):
    application_id = serializers.IntegerField(
        source="installment.application_id",
        read_only=True
    )

    customer_name = serializers.CharField(
        source="membership.customer.first_name",
        read_only=True,
    )

    customer_mobile = serializers.CharField(
        source="membership.customer.mobile_number",
        read_only=True,
    )

    group_name = serializers.CharField(
        source="membership.group.name",
        read_only=True,
    )

    group_code = serializers.CharField(
        source="membership.group.group_code",
        read_only=True,
    )

    installment_number = serializers.IntegerField(
        source="installment.installment_number",
        read_only=True,
    )

    due_date = serializers.DateField(
        source="installment.due_date",
        read_only=True,
    )

    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = GroupLoanMemberInstallment

        fields = [
            "id",
            "application_id",  # IMPORTANT: Added this field
            "customer_name",
            "customer_mobile",
            "group_name",
            "group_code",
            "installment_number",
            "due_date",
            "principal_due",
            "interest_due",
            "total_due",
            "paid_amount",
            "balance_due",
            "status",
        ]

    def get_balance_due(self, obj):
        return get_balance(obj)


class CollectionAllocationInputSerializer(serializers.Serializer):
    member_installment_id = serializers.IntegerField()
    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0.01,
    )


class FieldCollectionSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()

    payment_method = serializers.ChoiceField(
        choices=GroupCollection.PAYMENT_CHOICES
    )

    payment_date = serializers.DateField(required=False)

    reference = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    allocations = CollectionAllocationInputSerializer(
        many=True,
        allow_empty=False,
    )

    def validate(self, attrs):
        payment_date = attrs.get("payment_date")

        if payment_date is None:
            from django.utils import timezone
            attrs["payment_date"] = timezone.localdate()

        ids = [
            item["member_installment_id"]
            for item in attrs["allocations"]
        ]

        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({
                "allocations": "Duplicate EMI allocations are not allowed."
            })

        return attrs


class CollectionAllocationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="member_installment.membership.customer.first_name",
        read_only=True,
    )
    installment_number = serializers.IntegerField(
        source="member_installment.installment.installment_number",
        read_only=True,
    )

    class Meta:
        model = GroupCollectionAllocation
        fields = [
            "id",
            "customer_name",
            "installment_number",
            "amount",
        ]


class PaymentHistorySerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(
        source="application.group.name",
        read_only=True,
    )
    group_code = serializers.CharField(
        source="application.group.group_code",
        read_only=True,
    )
    allocations = CollectionAllocationSerializer(
        many=True,
        read_only=True,
    )
    collected_by = serializers.SerializerMethodField()

    class Meta:
        model = GroupCollection
        fields = [
            "id",
            "receipt_number",
            "application",
            "group_name",
            "group_code",
            "amount",
            "payment_method",
            "payment_date",
            "reference",
            "notes",
            "collected_by",
            "allocations",
            "created_at",
        ]

    def get_collected_by(self, obj):
        if obj.created_by:
            return obj.created_by.get_username()
        return None


class FollowUpSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="member_installment.membership.customer.first_name",
        read_only=True,
    )
    mobile_number = serializers.CharField(
        source="member_installment.membership.customer.mobile_number",
        read_only=True,
    )
    outstanding_amount = serializers.SerializerMethodField()

    class Meta:
        model = CollectionFollowUp
        fields = [
            "id",
            "member_installment",
            "customer_name",
            "mobile_number",
            "follow_up_date",
            "next_follow_up_date",
            "status",
            "remarks",
            "outstanding_amount",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "created_by",
            "created_at",
        ]

    def get_outstanding_amount(self, obj):
        return get_balance(obj.member_installment)

    def validate_member_installment(self, value):
        if value.installment.application.status != "disbursed":
            raise serializers.ValidationError(
                "Follow-up is allowed only for disbursed loans."
            )
        return value


class ReceiptSerializer(PaymentHistorySerializer):
    pass
