from rest_framework import serializers
from django.utils import timezone
from uuid import uuid4
from .models import RDProduct, RDAccount, RDInstalment, RDCollection
from .utils import (
    calculate_rd_maturity_date,
    calculate_rd_maturity_amount,
    generate_instalment_schedule,
)


class RDProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = RDProduct
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by"]


class RDInstalmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RDInstalment
        fields = "__all__"


class RDCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RDCollection
        fields = "__all__"
        read_only_fields = ["receipt_number", "collected_by", "created_at", "is_reversed"]


class RDAccountSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_mobile = serializers.CharField(source="customer.mobile_number", read_only=True)
    customer_id = serializers.IntegerField(source="customer.id", read_only=True)
    instalments = RDInstalmentSerializer(many=True, read_only=True)

    class Meta:
        model = RDAccount
        fields = "__all__"
        read_only_fields = [
            "account_number", "interest_rate", "maturity_date",
            "expected_maturity_amount", "status", "total_paid",
            "total_instalments_paid", "created_by", "approved_by",
            "approved_at", "created_at", "updated_at",
            "product_name", "customer_name", "customer_mobile", "customer_id",
            "instalments",
        ]

    def get_customer_name(self, obj):
        return obj.customer.get_full_name()

    def create(self, validated_data):
        product = validated_data["product"]
        request = self.context["request"]

        rate = product.interest_rate
        start_date = validated_data["start_date"]
        tenure = validated_data["tenure_months"]
        instalment = validated_data["monthly_instalment"]

        maturity_date = calculate_rd_maturity_date(start_date, tenure)
        expected_amount = calculate_rd_maturity_amount(
            instalment, tenure, rate, product.interest_type
        )

        last = RDAccount.objects.count() + 1
        account_number = f"RD{start_date.year}{last:05d}"

        status = "PENDING" if product.maker_checker_required else "ACTIVE"

        rd = RDAccount.objects.create(
            **validated_data,
            account_number=account_number,
            interest_rate=rate,
            maturity_date=maturity_date,
            expected_maturity_amount=expected_amount,
            created_by=request.user,
            status=status,
        )

        if status == "ACTIVE":
            generate_instalment_schedule(rd)

        return rd