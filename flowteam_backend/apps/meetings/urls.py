from django.urls import path

from apps.meetings.views import (
    MeetingDetailView,
    MeetingRecordingDetailView,
    MeetingRecordingListCreateView,
    TeamInstantMeetingCreateView,
    TeamMeetingListCreateView,
)

urlpatterns = [
    path("teams/<uuid:team_id>/meetings/", TeamMeetingListCreateView.as_view(), name="team-meetings"),
    path("teams/<uuid:team_id>/meetings/instant/", TeamInstantMeetingCreateView.as_view(), name="team-meetings-instant"),
    path("<uuid:meeting_id>/", MeetingDetailView.as_view(), name="meeting-detail"),
    path("<uuid:meeting_id>/recordings/", MeetingRecordingListCreateView.as_view(), name="meeting-recordings"),
    path("recordings/<uuid:recording_id>/", MeetingRecordingDetailView.as_view(), name="meeting-recording-detail"),
]
