from django.urls import path
from .consumers import ChatConsumer, NotificationConsumer, ChannelEventsConsumer, TeamPresenceConsumer

websocket_urlpatterns = [
    path("ws/chat/<uuid:channel_id>/", ChatConsumer.as_asgi()),
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/channels/", ChannelEventsConsumer.as_asgi()),
    path("ws/presence/<uuid:team_id>/", TeamPresenceConsumer.as_asgi()),
]
