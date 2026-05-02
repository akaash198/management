from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model


@shared_task
def send_push_async(user_id: str, title: str, body: str, url: str = "/dashboard") -> int:
    User = get_user_model()
    user = User.objects.filter(id=user_id).first()
    if not user:
        return 0

    from .push import send_web_push

    return send_web_push(user, title, body, url)
