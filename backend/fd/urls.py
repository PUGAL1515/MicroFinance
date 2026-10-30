from django.urls import path
from .views import (
    FDProductListCreateView,
    FDProductDetailView,
    FDAccountListCreateView,
    FDAccountDetailView,
    FDAccountApproveView,
    FDPrematureCloseView,
)

urlpatterns = [
    # Product
    path("products/", FDProductListCreateView.as_view()),
    path("products/<int:pk>/", FDProductDetailView.as_view()),

    # Accounts
    path("accounts/", FDAccountListCreateView.as_view()),
    path("accounts/<int:pk>/", FDAccountDetailView.as_view()),
    path("accounts/<int:pk>/approve/", FDAccountApproveView.as_view()),
    path("accounts/<int:pk>/premature-close/", FDPrematureCloseView.as_view()),
]