from django.urls import path
from .views import (
    RDProductListCreateView,
    RDProductDetailView,
    RDAccountListCreateView,
    RDAccountDetailView,
    RDAccountApproveView,
    RDCollectionCreateView,
    RDPrematureCloseView,
)

urlpatterns = [
    path("products/", RDProductListCreateView.as_view()),
    path("products/<int:pk>/", RDProductDetailView.as_view()),

    path("accounts/", RDAccountListCreateView.as_view()),
    path("accounts/<int:pk>/", RDAccountDetailView.as_view()),
    path("accounts/<int:pk>/approve/", RDAccountApproveView.as_view()),
    path("accounts/<int:pk>/premature-close/", RDPrematureCloseView.as_view()),

    path("collections/", RDCollectionCreateView.as_view()),
]