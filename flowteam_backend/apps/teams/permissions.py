from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from .models import TeamMember

def _get_team_id(request, view) -> str | None:
    """
    Try to extract a team id from common URL kwargs, query params, or request data.

    Notes:
    - Team endpoints use `id` (TeamDetailView/TeamMembersView).
    - Many list endpoints pass `team_id` in query params.
    - Create endpoints often include `team` in body.
    """
    team_id = (
        view.kwargs.get("team_id")
        or view.kwargs.get("team_pk")
        or view.kwargs.get("id")
        or view.kwargs.get("pk")
    )
    if team_id:
        return str(team_id)

    qp_team_id = request.query_params.get("team_id") if hasattr(request, "query_params") else None
    if qp_team_id:
        return str(qp_team_id)

    try:
        data_team = (request.data.get("team") or request.data.get("team_id")) if hasattr(request, "data") else None
    except Exception:
        data_team = None

    if data_team:
        return str(data_team)

    return None

def get_team_from_request(request, view):
    team_id = _get_team_id(request, view)
    if team_id:
        from .models import Team
        return Team.objects.filter(id=team_id).first()

    try:
        data = request.data if hasattr(request, "data") else {}
    except Exception:
        data = {}

    query_params = request.query_params if hasattr(request, "query_params") else {}
    lookup = lambda key: data.get(key) or query_params.get(key)

    project_id = lookup("project_id") or lookup("project")
    if project_id:
        from apps.projects.models import Project
        project = Project.objects.select_related("team").filter(id=project_id).first()
        if project:
            return project.team

    task_id = lookup("task_id") or lookup("task")
    if task_id:
        from apps.projects.models import Task
        task = Task.objects.select_related("project__team").filter(id=task_id).first()
        if task:
            return task.project.team

    sprint_id = lookup("sprint_id") or lookup("sprint")
    if sprint_id:
        from apps.projects.models import Sprint
        sprint = Sprint.objects.select_related("project__team").filter(id=sprint_id).first()
        if sprint:
            return sprint.project.team

    channel_id = lookup("channel_id") or lookup("channel")
    if channel_id:
        from apps.messaging.models import Channel
        channel = Channel.objects.select_related("team").filter(id=channel_id).first()
        if channel:
            return channel.team

    meeting_id = lookup("meeting_id") or lookup("meeting")
    if meeting_id:
        from apps.meetings.models import Meeting
        meeting = Meeting.objects.select_related("team").filter(id=meeting_id).first()
        if meeting:
            return meeting.team

    return None

class IsTeamCEO(permissions.BasePermission):
    """CEO (Owner) only."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        if request.user.is_superuser: return True
        team_id = _get_team_id(request, view)
        if not team_id: return False
        return TeamMember.objects.filter(team_id=team_id, user=request.user, role=TeamMember.CEO).exists()

class IsTeamAdmin(permissions.BasePermission):
    """CEO or Admin."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        if request.user.is_superuser: return True
        team_id = _get_team_id(request, view)
        if not team_id: return False
        return TeamMember.objects.filter(
            team_id=team_id, 
            user=request.user, 
            role__in=[TeamMember.CEO, TeamMember.ADMIN]
        ).exists()

class IsTeamManager(permissions.BasePermission):
    """CEO, Admin, or Manager."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        if request.user.is_superuser: return True
        team_id = _get_team_id(request, view)
        if not team_id: return False
        return TeamMember.objects.filter(
            team_id=team_id, 
            user=request.user, 
            role__in=[TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER]
        ).exists()

class IsTeamMember(permissions.BasePermission):
    """Any member of the team (including Viewers)."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        if request.user.is_superuser: return True
        team_id = _get_team_id(request, view)
        if not team_id: return False
        return TeamMember.objects.filter(team_id=team_id, user=request.user).exists()

class IsAIEnabled(permissions.BasePermission):
    message = "AI features require an AI-enabled plan. Upgrade in Settings > Plan."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        team = get_team_from_request(request, view)
        if not team:
            raise PermissionDenied("Team context is required for AI features.")
        if request.user.is_superuser:
            return True
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            raise PermissionDenied("You are not a member of this team.")
        if not bool(getattr(team, "ai_enabled", False)):
            raise PermissionDenied(self.message)
        return True
