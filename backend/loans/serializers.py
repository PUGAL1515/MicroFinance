from rest_framework import serializers

from .models import (
    GroupLoanPlan,
    LoanGroup,
    GroupMembership,
    GroupLoanApplication,
    GroupLoanInstallment,
    GroupLoanPayment,
    GroupLoanMemberInstallment,
    GroupCollection,
    GroupCollectionAllocation,
)


class GroupLoanPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupLoanPlan
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        minimum = attrs.get(
            "min_members",
            getattr(self.instance, "min_members", 5),
        )
        maximum = attrs.get(
            "max_members",
            getattr(self.instance, "max_members", 10),
        )

        min_amount = attrs.get(
            "min_loan_per_member",
            getattr(self.instance, "min_loan_per_member", None),
        )
        max_amount = attrs.get(
            "max_loan_per_member",
            getattr(self.instance, "max_loan_per_member", None),
        )

        if minimum > maximum:
            raise serializers.ValidationError({
                "min_members": "Minimum cannot exceed maximum."
            })

        if (
            min_amount is not None
            and max_amount is not None
            and min_amount > max_amount
        ):
            raise serializers.ValidationError({
                "min_loan_per_member": "Minimum loan exceeds maximum."
            })

        return attrs


class GroupMembershipSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.get_full_name",
        read_only=True,
    )
    mobile_number = serializers.CharField(
        source="customer.mobile_number",
        read_only=True,
    )

    class Meta:
        model = GroupMembership
        fields = [
            "id",
            "group",
            "customer",
            "customer_name",
            "mobile_number",
            "is_leader",
            "is_active",
            "joined_at",
        ]
        read_only_fields = ["id", "joined_at"]


class LoanGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = LoanGroup
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()


class GroupLoanApplicationSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(
        source="group.name",
        read_only=True,
    )
    group_code = serializers.CharField(
        source="group.group_code",
        read_only=True,
    )
    member_count = serializers.SerializerMethodField()
    has_schedule = serializers.SerializerMethodField()
    installment_count = serializers.SerializerMethodField()

    class Meta:
        model = GroupLoanApplication
        fields = "__all__"
        read_only_fields = [
            "status",
            "approved_total",
            "interest_rate",
            "interest_method",
            "tenure_months",
            "repayment_frequency",
            "submitted_at",
            "decided_at",
        ]

    def get_member_count(self, obj):
        return obj.group.memberships.filter(is_active=True).count()

    def get_has_schedule(self, obj):
        return obj.installments.exists()

    def get_installment_count(self, obj):
        return obj.installments.count()


class GroupLoanInstallmentSerializer(serializers.ModelSerializer):
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = GroupLoanInstallment
        fields = "__all__"
        read_only_fields = [
            "paid_amount",
            "status",
        ]

    def get_balance_due(self, obj):
        return str(obj.balance_due)


class GroupLoanPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupLoanPayment
        fields = "__all__"
        read_only_fields = ["created_at"]


class GroupLoanMemberInstallmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="membership.customer.get_full_name",
        read_only=True,
    )
    customer_id = serializers.IntegerField(
        source="membership.customer_id",
        read_only=True,
    )
    mobile_number = serializers.CharField(
        source="membership.customer.mobile_number",
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
            "installment",
            "installment_number",
            "due_date",
            "membership",
            "customer_id",
            "customer_name",
            "mobile_number",
            "principal_due",
            "interest_due",
            "total_due",
            "paid_amount",
            "balance_due",
            "status",
        ]

    def get_balance_due(self, obj):
        return str(obj.balance_due)


class GroupCollectionAllocationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="member_installment.membership.customer.get_full_name",
        read_only=True,
    )

    class Meta:
        model = GroupCollectionAllocation
        fields = [
            "id",
            "member_installment",
            "customer_name",
            "amount",
        ]


class GroupCollectionSerializer(serializers.ModelSerializer):
    allocations = GroupCollectionAllocationSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = GroupCollection
        fields = [
            "id",
            "receipt_number",
            "application",
            "amount",
            "payment_method",
            "payment_date",
            "reference",
            "notes",
            "allocations",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "receipt_number",
            "created_by",
            "created_at",
        ]