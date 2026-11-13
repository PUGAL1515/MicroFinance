from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.contrib.auth import get_user_model
from accounts.permissions import IsRD_FD_Admin, IsSuperAdmin
from notifications.utils import notify_user
from .models import FDProduct, FDAccount, FDTransaction
from .serializers import FDProductSerializer, FDAccountSerializer

User = get_user_model()


# ==================== PRODUCT (Super Admin only) ====================
class FDProductListCreateView(generics.ListCreateAPIView):
    queryset = FDProduct.objects.all()
    serializer_class = FDProductSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FDProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FDProduct.objects.all()
    serializer_class = FDProductSerializer
    permission_classes = [IsSuperAdmin]


# ==================== FD ACCOUNT (RD/FD Admin) ====================
class FDAccountListCreateView(generics.ListCreateAPIView):
    queryset = FDAccount.objects.select_related("product").all()
    serializer_class = FDAccountSerializer
    permission_classes = [IsRD_FD_Admin]

    def perform_create(self, serializer):
        account = serializer.save()

        # Notify Super Admins + RD/FD Admins
        admins = User.objects.filter(
            profile__role__in=["SUPER_ADMIN", "RD_FD_ADMIN"]
        )

        for admin in admins:
            notify_user(
                user=admin,
                title="New FD Account Opened",
                message=f"FD Account {getattr(account, 'account_number', account.id)} has been created",
                level="info",
                link="/fd",
            )


class FDAccountDetailView(generics.RetrieveUpdateAPIView):
    queryset = FDAccount.objects.select_related("product").all()
    serializer_class = FDAccountSerializer
    permission_classes = [IsRD_FD_Admin]


class FDAccountApproveView(APIView):
    permission_classes = [IsRD_FD_Admin]

    def post(self, request, pk):
        try:
            fd = FDAccount.objects.get(pk=pk)
        except FDAccount.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if fd.status != "PENDING":
            return Response(
                {"detail": "Only pending accounts can be approved"},
                status=400,
            )

        fd.status = "ACTIVE"
        fd.approved_by = request.user
        fd.approved_at = timezone.now()
        fd.save()

        # Create initial deposit transaction
        FDTransaction.objects.create(
            fd_account=fd,
            transaction_type="DEPOSIT",
            amount=fd.deposit_amount,
            transaction_date=fd.start_date,
            created_by=request.user,
            remarks="Initial deposit",
        )

        # Notify the creator (if available)
        if hasattr(fd, "created_by") and fd.created_by:
            notify_user(
                user=fd.created_by,
                title="FD Account Approved",
                message=f"Your FD Account {fd.account_number} has been approved",
                level="success",
                link="/fd",
            )

        # Notify other admins
        admins = User.objects.filter(
            profile__role__in=["SUPER_ADMIN", "RD_FD_ADMIN"]
        ).exclude(id=request.user.id)

        for admin in admins:
            notify_user(
                user=admin,
                title="FD Account Approved",
                message=f"FD Account {fd.account_number} approved by {request.user.username}",
                level="success",
                link="/fd",
            )

        return Response({"detail": "FD Account approved successfully"})


class FDPrematureCloseView(APIView):
    permission_classes = [IsRD_FD_Admin]

    def post(self, request, pk):
        try:
            fd = FDAccount.objects.get(pk=pk)
        except FDAccount.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if fd.status != "ACTIVE":
            return Response(
                {"detail": "Only active FD can be closed"}, status=400
            )

        # Simple penalty calculation
        penalty = 0
        if fd.product.premature_allowed:
            if fd.product.penalty_type == "PERCENT_INTEREST":
                penalty = (fd.maturity_amount - fd.deposit_amount) * (
                    fd.product.penalty_value / 100
                )
            elif fd.product.penalty_type == "PERCENT_PRINCIPAL":
                penalty = fd.deposit_amount * (fd.product.penalty_value / 100)
            else:
                penalty = fd.product.penalty_value

        payout = (
            fd.deposit_amount
            + (fd.maturity_amount - fd.deposit_amount)
            - penalty
        )

        fd.status = "PREMATURE_CLOSED"
        fd.save()

        FDTransaction.objects.create(
            fd_account=fd,
            transaction_type="PREMATURE_CLOSURE",
            amount=payout,
            transaction_date=timezone.now().date(),
            created_by=request.user,
            remarks=f"Premature closure. Penalty: {penalty}",
        )

        # Notify admins
        admins = User.objects.filter(
            profile__role__in=["SUPER_ADMIN", "RD_FD_ADMIN"]
        )

        for admin in admins:
            notify_user(
                user=admin,
                title="FD Premature Closure",
                message=f"FD {fd.account_number} closed. Payout: ₹{payout}",
                level="warning",
                link="/fd",
            )

        return Response(
            {
                "detail": "FD closed prematurely",
                "payout_amount": payout,
                "penalty": penalty,
            }
        )