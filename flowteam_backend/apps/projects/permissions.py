from guardian.shortcuts import assign_perm, remove_perm
from apps.projects.models import ProjectRole
from apps.teams.models import TeamMember

# Maps API permission name → capability key on ProjectRole
CAPABILITY_MAP = {
    "view_project": "can_view",
    "edit_project": "can_edit_tasks",
    "delete_task": "can_delete_tasks",
    "manage_project": "can_manage_project",
    "delete_project": "can_delete_project",
    "edit_columns": "can_edit_columns",
    "export_project": "can_export",
    "comment_project": "can_comment",
    "manage_members": "can_manage_members",
}

# Roles a given role is allowed to assign (prevents privilege escalation)
ASSIGNABLE_ROLES = {
    "project_admin": ["project_admin", "editor", "commenter", "viewer"],
    "editor": ["commenter", "viewer"],
    "commenter": [],
    "viewer": [],
}

# Team roles that inherit project_admin automatically
_TEAM_ADMIN_ROLES = {TeamMember.CEO, TeamMember.ADMIN}
# Team roles that inherit editor automatically
_TEAM_EDITOR_ROLES = {TeamMember.MANAGER, TeamMember.MEMBER}


def get_user_project_role(user, project) -> str | None:
    """Return effective role string for a user on a project, or None if no access."""
    role_obj = ProjectRole.objects.filter(project=project, user=user).first()
    if role_obj:
        if not role_obj.is_active():
            return None
        return role_obj.role

    try:
        member = TeamMember.objects.get(team=project.team, user=user)
        return {
            "ceo": "project_admin",
            "admin": "project_admin",
            "manager": "editor",
            "member": "editor",
            "viewer": "viewer",
        }.get(member.role, "viewer")
    except TeamMember.DoesNotExist:
        return None


def check_project_permission(user, project, permission: str) -> bool:
    """
    Check if user has a specific project permission.

    Resolution order:
      1. Superuser → always True
      2. Team CEO/Admin → always True (hierarchy shortcut)
      3. Active ProjectRole override with capability check
      4. Team Manager/Member default editor capabilities
      5. Guardian object permission fallback
    """
    # Fast path for team admins
    if TeamMember.objects.filter(
        team=project.team, user=user, role__in=list(_TEAM_ADMIN_ROLES)
    ).exists():
        return True

    capability = CAPABILITY_MAP.get(permission)

    # Check active ProjectRole override first
    role_obj = ProjectRole.objects.filter(project=project, user=user).first()
    if role_obj:
        if not role_obj.is_active():
            return False
        caps = role_obj.effective_capabilities()
        if capability:
            return bool(caps.get(capability, False))
        # Fall through to guardian if capability key is unknown
        return user.has_perm(f"projects.{permission}", project)

    # Implicit role from team membership
    try:
        member = TeamMember.objects.get(team=project.team, user=user)
    except TeamMember.DoesNotExist:
        return False

    implicit_role = {"manager": "editor", "member": "editor", "viewer": "viewer"}.get(member.role)
    if implicit_role and capability:
        defaults = ProjectRole.DEFAULT_CAPABILITIES.get(implicit_role, {})
        return bool(defaults.get(capability, False))

    return user.has_perm(f"projects.{permission}", project)


def can_assign_role(assigner_role: str, target_role: str) -> bool:
    """Return True if assigner_role is allowed to grant target_role."""
    return target_role in ASSIGNABLE_ROLES.get(assigner_role, [])


def sync_project_permissions(project_role: ProjectRole):
    """Sync Guardian object-level permissions from the ProjectRole."""
    project = project_role.project
    user = project_role.user

    all_perms = [
        "projects.view_project",
        "projects.edit_project",
        "projects.manage_project",
        "projects.delete_project",
    ]
    for p in all_perms:
        remove_perm(p, user, project)

    if not project_role.is_active():
        return

    caps = project_role.effective_capabilities()

    if caps.get("can_view"):
        assign_perm("projects.view_project", user, project)
    if caps.get("can_edit_tasks"):
        assign_perm("projects.edit_project", user, project)
    if caps.get("can_manage_project"):
        assign_perm("projects.manage_project", user, project)
    if caps.get("can_delete_project"):
        assign_perm("projects.delete_project", user, project)
