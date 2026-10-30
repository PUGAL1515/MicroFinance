from django.contrib import admin
from django.urls import path, include
from customer import urls as customer_urls
from loans import urls as loans_urls
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/customer/', include(customer_urls)),
    path('api/accounts/', include('accounts.urls')), 
    path("api/", include("loans.urls")), 
]