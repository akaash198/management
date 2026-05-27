import uuid
from datetime import datetime, time

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework import status, permissions, views

from apps.meetings.models import Meeting, MeetingRecording, create_meeting_channel, ensure_channel_membership, ensure_team_membership
from apps.meetings.serializers import (
    MeetingSerializer,
    MeetingCreateSerializer,
    MeetingInstantSerializer,
    MeetingPatchSerializer,
    MeetingRecordingSerializer,
)
from apps.teams.models import Team, TeamMember
from config.utils import standardize_response
from apps.meetings.tasks import transcribe_meeting_recording


def _require_team_access(request, team_id: str) -> Team:
    team = get_object_or_404(Team, id=team_id)
    if not ensure_team_membership(team=team, user=request.user):
        raise PermissionError("Forbidden")
    return team


def _valid_attendees(team: Team, attendee_ids: list[str]) -> list[str]:
    if not attendee_ids:
        return []
    valid = list(
        TeamMember.objects.filter(team=team, user_id__in=attendee_ids).values_list("user_id", flat=True)
    )
    return [str(x) for x in valid]


def _can_manage_meeting(*, meeting: Meeting, user) -> bool:
    if str(meeting.created_by_id) == str(user.id):
        return True
    return TeamMember.objects.filter(
        team=meeting.team,
        user=user,
        role__in=[TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER],
    ).exists()


class TeamMeetingListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id):
        try:
            team = _require_team_access(request, team_id)
        except PermissionError:
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        mine = request.query_params.get("mine") == "true"
        status_filter = request.query_params.get("status")
        q = (request.query_params.get("q") or "").strip()
        qs = Meeting.objects.filter(team=team).select_related("channel").prefetch_related("attendees")
        if start and end:
            start_date = parse_date(start)
            end_date = parse_date(end)
            start_dt = parse_datetime(start) or (timezone.make_aware(datetime.combine(start_date, time.min)) if start_date else None)
            end_dt = parse_datetime(end) or (timezone.make_aware(datetime.combine(end_date, time.max)) if end_date else None)
            if start_dt and end_dt:
                qs = qs.filter(starts_at__range=[start_dt, end_dt])

        if mine:
            qs = qs.filter(attendees=request.user)

        if status_filter:
            qs = qs.filter(status=status_filter)

        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        qs = qs.order_by("starts_at")
        return standardize_response(data=MeetingSerializer(qs, many=True).data)

    def post(self, request, team_id):
        try:
            team = _require_team_access(request, team_id)
        except PermissionError:
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        payload = MeetingCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        attendee_ids = _valid_attendees(team, payload.validated_data.get("attendee_ids", []))
        if str(request.user.id) not in attendee_ids:
            attendee_ids.append(str(request.user.id))

        starts_at = payload.validated_data["starts_at"]
        status_value = Meeting.STATUS_SCHEDULED if starts_at >= timezone.now() else Meeting.STATUS_ACTIVE

        meeting_id = uuid.uuid4()
        channel = create_meeting_channel(team=team, created_by=request.user, meeting_id=meeting_id, title=payload.validated_data["title"])
        meeting = Meeting.objects.create(
            id=meeting_id,
            team=team,
            title=payload.validated_data["title"],
            description=payload.validated_data.get("description", ""),
            call_type=payload.validated_data.get("call_type", Meeting.CALL_VIDEO),
            starts_at=starts_at,
            duration_minutes=payload.validated_data.get("duration_minutes", 30),
            status=status_value,
            is_instant=False,
            created_by=request.user,
            channel=channel,
        )

        meeting.attendees.set(attendee_ids)
        ensure_channel_membership(channel=channel, user_ids=attendee_ids)

        return standardize_response(data=MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


class TeamInstantMeetingCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, team_id):
        try:
            team = _require_team_access(request, team_id)
        except PermissionError:
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        payload = MeetingInstantSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        attendee_ids = _valid_attendees(team, payload.validated_data.get("attendee_ids", []))
        if str(request.user.id) not in attendee_ids:
            attendee_ids.append(str(request.user.id))

        meeting_id = uuid.uuid4()
        channel = create_meeting_channel(team=team, created_by=request.user, meeting_id=meeting_id, title=payload.validated_data.get("title") or "Instant meeting")
        meeting = Meeting.objects.create(
            id=meeting_id,
            team=team,
            title=payload.validated_data.get("title") or "Instant meeting",
            description=payload.validated_data.get("description", ""),
            call_type=payload.validated_data.get("call_type", Meeting.CALL_VIDEO),
            starts_at=timezone.now(),
            duration_minutes=30,
            status=Meeting.STATUS_ACTIVE,
            is_instant=True,
            created_by=request.user,
            channel=channel,
        )
        meeting.attendees.set(attendee_ids)
        ensure_channel_membership(channel=channel, user_ids=attendee_ids)

        return standardize_response(data=MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


class MeetingDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meeting_id):
        meeting = get_object_or_404(Meeting.objects.select_related("team", "channel").prefetch_related("attendees"), id=meeting_id)
        if not ensure_team_membership(team=meeting.team, user=request.user):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        return standardize_response(data=MeetingSerializer(meeting).data)

    def patch(self, request, meeting_id):
        meeting = get_object_or_404(Meeting.objects.select_related("team", "channel"), id=meeting_id)
        if not ensure_team_membership(team=meeting.team, user=request.user):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        payload = MeetingPatchSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        if data and not _can_manage_meeting(meeting=meeting, user=request.user):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        # Title/metadata
        for field in ["title", "description", "call_type", "starts_at", "duration_minutes", "status"]:
            if field in data:
                setattr(meeting, field, data[field])

        meeting.save()

        if "attendee_ids" in data:
            attendee_ids = _valid_attendees(meeting.team, data.get("attendee_ids", []))
            if str(request.user.id) not in attendee_ids:
                attendee_ids.append(str(request.user.id))
            meeting.attendees.set(attendee_ids)
            ensure_channel_membership(channel=meeting.channel, user_ids=attendee_ids)

        return standardize_response(data=MeetingSerializer(meeting).data)


class MeetingRecordingListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meeting_id):
        meeting = get_object_or_404(Meeting.objects.select_related("team", "channel"), id=meeting_id)
        if not ensure_team_membership(team=meeting.team, user=request.user):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        qs = MeetingRecording.objects.filter(meeting=meeting).order_by("-created_at")
        return standardize_response(data=MeetingRecordingSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request, meeting_id):
        meeting = get_object_or_404(Meeting.objects.select_related("team", "channel", "created_by"), id=meeting_id)
        if not ensure_team_membership(team=meeting.team, user=request.user):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        audio = request.FILES.get("file")
        if not audio:
            return standardize_response(success=False, error="file is required", status=status.HTTP_400_BAD_REQUEST)

        rec = MeetingRecording.objects.create(
            meeting=meeting,
            created_by=request.user,
            audio_file=audio,
            mime_type=getattr(audio, "content_type", "") or "",
            status=MeetingRecording.STATUS_UPLOADED,
        )

        # Kick off async transcription (best-effort). If OPENAI_API_KEY isn't configured, task will mark failed.
        language = (request.data.get("language") or "").strip() or None
        try:
            transcribe_meeting_recording.delay(str(rec.id), language=language)
        except Exception:
            pass

        return standardize_response(
            data=MeetingRecordingSerializer(rec, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MeetingRecordingDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, recording_id):
        rec = get_object_or_404(MeetingRecording.objects.select_related("meeting", "meeting__team"), id=recording_id)
        if not ensure_team_membership(team=rec.meeting.team, user=request.user):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        return standardize_response(data=MeetingRecordingSerializer(rec, context={"request": request}).data)
