from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    ROLE_SUPER_ADMIN = "SUPER_ADMIN"
    ROLE_RD_FD_ADMIN = "RD_FD_ADMIN"
    ROLE_GROUP_LOAN_ADMIN = "GROUP_LOAN_ADMIN"

    ROLE_CHOICES = [
        (ROLE_SUPER_ADMIN, "Super Admin"),
        (ROLE_RD_FD_ADMIN, "RD/FD Admin"),
        (ROLE_GROUP_LOAN_ADMIN, "Group Loan Admin"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default=ROLE_RD_FD_ADMIN
    )
    phone = models.CharField(max_length=15, blank=True, null=True)
    is_active_staff = models.BooleanField(default=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    @property
    def is_super_admin(self):
        return self.role == self.ROLE_SUPER_ADMIN

    @property
    def is_rd_fd_admin(self):
        return self.role == self.ROLE_RD_FD_ADMIN

    @property
    def is_group_loan_admin(self):
        return self.role == self.ROLE_GROUP_LOAN_ADMIN


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        # Ensure profile always exists
        UserProfile.objects.get_or_create(user=instance)