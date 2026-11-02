
from django.urls import path
from . import views

urlpatterns = [
    # Customer
    path("", views.CustomerListCreateView.as_view(), name="customer-list-create"),
    path("<int:customer_id>/", views.CustomerDetailView.as_view(), name="customer-detail"),

    # KYC
    path(
        "<int:customer_id>/kyc/",
        views.CustomerKYCListCreateView.as_view(),
        name="customer-kyc",
    ),
    path(
        "kyc/<int:kyc_id>/verify/",
        views.KYCVerificationView.as_view(),
        name="kyc-verify",
    ),

    # Loan applications
    path(
        "loan-applications/",
        views.LoanApplicationListCreateView.as_view(),
        name="loan-application-list-create",
    ),
    path(
        "loan-applications/<int:pk>/",
        views.LoanApplicationDetailView.as_view(),
        name="loan-application-detail",
    ),
    path(
        "loan-applications/<int:application_id>/decision/",
        views.LoanApplicationDecisionView.as_view(),
        name="loan-application-decision",
    ),

    # Approved loans and disbursement
    path("loans/", views.LoanListView.as_view(), name="loan-list"),
    path(
        "loans/<int:loan_id>/disburse/",
        views.LoanDisbursementView.as_view(),
        name="loan-disburse",
    ),

    # EMI and collections
    path("emis/", views.EMIListView.as_view(), name="emi-list"),
    path(
        "collections/",
        views.CollectionListCreateView.as_view(),
        name="collection-list-create",
    ),
]
