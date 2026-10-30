from rest_framework import serializers
from .models import FDProduct, FDAccount, FDTransaction
from .utils import calculate_maturity_date, calculate_maturity_amount


class FDProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = FDProduct
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by"]


class FDAccountSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = FDAccount
        fields = "__all__"
        read_only_fields = [
            "account_number", "maturity_date", "maturity_amount",
            "interest_rate", "status", "created_by", "approved_by",
            "approved_at", "created_at", "updated_at"
        ]

    def create(self, validated_data):
        product = validated_data["product"]
        request = self.context["request"]

        # Lock interest rate from product
        rate = product.interest_rate
        if product.is_senior_citizen:
            rate += product.senior_extra_rate

        start_date = validated_data["start_date"]
        tenure_value = validated_data["tenure_value"]

        maturity_date = calculate_maturity_date(start_date, tenure_value, product.tenure_unit)
        maturity_amount = calculate_maturity_amount(
            validated_data["deposit_amount"],
            rate,
            tenure_value,
            product.tenure_unit,
            product.interest_type,
            product.compounding_frequency,
        )

        # Generate account number
        last = FDAccount.objects.count() + 1
        account_number = f"FD{start_date.year}{last:05d}"

        fd = FDAccount.objects.create(
            **validated_data,
            account_number=account_number,
            interest_rate=rate,
            maturity_date=maturity_date,
            maturity_amount=maturity_amount,
            created_by=request.user,
            status="PENDING" if product.maker_checker_required else "ACTIVE",
        )
        return fd


class FDTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FDTransaction
        fields = "__all__"
        read_only_fields = ["created_at", "created_by"]