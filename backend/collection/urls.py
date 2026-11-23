
from django.urls import path

from .views import (
    CollectionDashboardView,
    TodayDuesView,
    FieldCollectionView,
    PaymentHistoryView,
    ReceiptDetailView,
    OverdueListView,
    FollowUpView,
    FDRDSummaryView,
    FDAccountListView,
    RDAccountListView,
    RDCollectionReportView,
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
    path("fd-rd/summary/", FDRDSummaryView.as_view(), name="fd-rd-summary"),
    path("fd-rd/fd-accounts/", FDAccountListView.as_view(), name="fd-accounts-report"),
    path("fd-rd/rd-accounts/", RDAccountListView.as_view(), name="rd-accounts-report"),
    path("fd-rd/rd-collections/", RDCollectionReportView.as_view(), name="rd-collections-report"),
]
