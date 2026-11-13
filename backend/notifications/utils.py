from .models import Notification


def notify_user(user, title, message, level="info", link=""):
    """
    Create a notification for a single user.
    Example:
        notify_user(admin, "New Loan", "Application submitted", link="/group-loans/12")
    """
    if not user:
        return None

    return Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        level=level,
        link=link or "",
    )


def notify_users(users, title, message, level="info", link=""):
    """Send the same notification to multiple users."""
    notifications = [
        Notification(
            recipient=user,
            title=title,
            message=message,
            level=level,
            link=link or "",
        )
        for user in users
        if user
    ]
    return Notification.objects.bulk_create(notifications)