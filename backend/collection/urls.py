
from django.urls import path

from .views import (
    CollectionDashboardView,
    TodayDuesView,
    FieldCollectionView,
    PaymentHistoryView,
    ReceiptDetailView,
    OverdueListView,
    FollowUpView,
)


urlpatterns = [
    path(
        "dashboard/",
        CollectionDashboardView.as_view(),
        name="collection-dashboard",
    ),

    path(
        "today-dues/",
        TodayDuesView.as_view(),
        name="today-dues",
    ),

    path(
        "field-collection/",
        FieldCollectionView.as_view(),
        name="field-collection",
    ),

    path(
        "payments/",
        PaymentHistoryView.as_view(),
        name="collection-payments",
    ),

    path(
        "receipts/<int:pk>/",
        ReceiptDetailView.as_view(),
        name="collection-receipt",
    ),

    path(
        "overdue/",
        OverdueListView.as_view(),
        name="collection-overdue",
    ),

    path(
        "follow-ups/",
        FollowUpView.as_view(),
        name="collection-follow-ups",
    ),
]
