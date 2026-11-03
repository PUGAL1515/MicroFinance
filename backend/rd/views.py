from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from uuid import uuid4

from accounts.permissions import IsRD_FD_Admin, IsSuperAdmin
from .models import RDProduct, RDAccount, RDInstalment, RDCollection
from .serializers import (
    RDProductSerializer,
    RDAccountSerializer,
    RDInstalmentSerializer,
    RDCollectionSerializer,
)
from .utils import generate_instalment_schedule


# ========== PRODUCT (Super Admin) ==========
class RDProductListCreateView(generics.ListCreateAPIView):
    queryset = RDProduct.objects.all()
    serializer_class = RDProductSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RDProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RDProduct.objects.all()
    serializer_class = RDProductSerializer
    permission_classes = [IsSuperAdmin]


# ========== ACCOUNT (RD/FD Admin) ==========
class RDAccountListCreateView(generics.ListCreateAPIView):
    queryset = RDAccount.objects.select_related("product", "customer").all()
    serializer_class = RDAccountSerializer
    permission_classes = [IsRD_FD_Admin]


class RDAccountDetailView(generics.RetrieveAPIView):
    queryset = RDAccount.objects.select_related("product", "customer").prefetch_related("instalments")
    serializer_class = RDAccountSerializer
    permission_classes = [IsRD_FD_Admin]


class RDAccountApproveView(APIView):
    permission_classes = [IsRD_FD_Admin]

    def post(self, request, pk):
        try:
            rd = RDAccount.objects.get(pk=pk)
        except RDAccount.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if rd.status != "PENDING":
            return Response({"detail": "Only pending accounts can be approved"}, status=400)

        rd.status = "ACTIVE"
        rd.approved_by = request.user
        rd.approved_at = timezone.now()
        rd.save()

        generate_instalment_schedule(rd)
        return Response({"detail": "RD Account approved and schedule generated"})


# ========== COLLECTIONS ==========
class RDCollectionCreateView(APIView):
    permission_classes = [IsRD_FD_Admin]

    @transaction.atomic
    def post(self, request):
        instalment_id = request.data.get("instalment")
        amount = request.data.get("amount")
        payment_mode = request.data.get("payment_mode", "CASH")
        collection_date = request.data.get("collection_date", timezone.localdate().isoformat())
        remarks = request.data.get("remarks", "")

        try:
            instalment = RDInstalment.objects.select_for_update().get(pk=instalment_id)
        except RDInstalment.DoesNotExist:
            return Response({"detail": "Instalment not found"}, status=404)

        if instalment.status == "PAID":
            return Response({"detail": "Instalment already paid"}, status=400)

        amount = float(amount)
        outstanding = float(instalment.amount_due) - float(instalment.amount_paid)

        if amount <= 0:
            return Response({"detail": "Amount must be > 0"}, status=400)
        if amount > outstanding + 0.01:
            return Response({"detail": f"Amount exceeds outstanding ({outstanding})"}, status=400)

        receipt = f"RDR{uuid4().hex[:10].upper()}"

        collection = RDCollection.objects.create(
            instalment=instalment,
            amount=amount,
            payment_mode=payment_mode,
            receipt_number=receipt,
            collection_date=collection_date,
            remarks=remarks,
            collected_by=request.user,
        )

        instalment.amount_paid = float(instalment.amount_paid) + amount
        if instalment.amount_paid >= float(instalment.amount_due):
            instalment.status = "PAID"
            instalment.paid_date = collection_date
        else:
            instalment.status = "PARTIAL"
        instalment.save()

        # Update account totals
        account = instalment.rd_account
        account.total_paid = float(account.total_paid) + amount
        if instalment.status == "PAID":
            account.total_instalments_paid += 1
        account.save()

        return Response({
            "detail": "Collection recorded",
            "receipt_number": receipt,
            "instalment_status": instalment.status,
        }, status=201)


class RDPrematureCloseView(APIView):
    permission_classes = [IsRD_FD_Admin]

    def post(self, request, pk):
        try:
            rd = RDAccount.objects.get(pk=pk)
        except RDAccount.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if rd.status != "ACTIVE":
            return Response({"detail": "Only active RD can be closed"}, status=400)

        if not rd.product.premature_allowed:
            return Response({"detail": "Premature closure not allowed for this product"}, status=400)

        # Simple payout = total paid (interest calculation can be improved later)
        payout = rd.total_paid

        rd.status = "PREMATURE_CLOSED"
        rd.save()

        return Response({
            "detail": "RD closed prematurely",
            "payout_amount": payout,
            "total_paid": rd.total_paid,
        })