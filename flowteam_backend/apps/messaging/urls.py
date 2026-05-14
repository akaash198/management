from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChannelViewSet, MessageViewSet, NotificationViewSet, SavedMessageViewSet, MessageEditHistoryView, CallViewSet, MessageSummaryView

router = DefaultRouter()
router.register(r"channels", ChannelViewSet, basename="channel")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"saved", SavedMessageViewSet, basename="saved-message")
router.register(r"calls", CallViewSet, basename="call")

urlpatterns = [
    path("", include(router.urls)),
    path("channels/<uuid:channel_id>/messages/", MessageViewSet.as_view({"get": "list", "post": "create"}), name="channel-messages"),
    path(
        "channels/<uuid:channel_id>/messages/<uuid:message_id>/history/",
        MessageEditHistoryView.as_view(),
        name="message-edit-history",
    ),
    path("summary/missed/", MessageSummaryView.as_view(), name="missed-summary"),
]
