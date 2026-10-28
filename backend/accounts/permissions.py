from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.is_super_admin
            and request.user.profile.is_active_staff
        )


class IsRD_FD_Admin(BasePermission):
    """
    Super Admin OR RD/FD Admin
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, "profile", None)
        if not profile or not profile.is_active_staff:
            return False
        return profile.is_super_admin or profile.is_rd_fd_admin


class IsGroupLoanAdmin(BasePermission):
    """
    Super Admin OR Group Loan Admin
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, "profile", None)
        if not profile or not profile.is_active_staff:
            return False
        return profile.is_super_admin or profile.is_group_loan_admin


class IsSuperAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return IsSuperAdmin().has_permission(request, view)