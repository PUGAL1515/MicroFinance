
from django.contrib import admin

from .models import CollectionFollowUp


@admin.register(CollectionFollowUp)
class CollectionFollowUpAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "member_installment",
        "follow_up_date",
        "next_follow_up_date",
        "status",
        "created_by",
    )

    list_filter = (
        "status",
        "follow_up_date",
    )

    search_fields = (
        "member_installment__membership__customer__first_name",
        "member_installment__membership__customer__mobile_number",
        "remarks",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )
