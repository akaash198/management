from guardian.shortcuts import assign_perm, remove_perm
from apps.projects.models import ProjectRole
from django.db import models

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

def get_user_project_role(user, project) -> str | None:
    """Return effective role string for a user on a project, or None if no access."""
    role_obj = ProjectRole.objects.filter(project=project, user=user).first()
    if role_obj:
        if not role_obj.is_active():
            return None
        return role_obj.role


def check_project_permission(user, project, permission: str) -> bool:
    """
    Check if user has a specific project permission.

    Resolution order:
      1. Superuser → always True
      2. Active ProjectRole with capability check
      3. Guardian object permission fallback
    """
    # Superuser -> always True
    if getattr(user, "is_superuser", False):
        return True

    capability = CAPABILITY_MAP.get(permission)

    # ProjectRole membership is the source of truth for access.
    role_obj = ProjectRole.objects.filter(project=project, user=user).first()
    if role_obj:
        if not role_obj.is_active():
            return False
        caps = role_obj.effective_capabilities()
        if capability:
            return bool(caps.get(capability, False))
        # Fall through to guardian if capability key is unknown
        return user.has_perm(f"projects.{permission}", project)

    # Legacy compatibility: if the user is already assigned/reporter on tasks in the project,
    # treat them as a member and implicitly grant baseline "editor" access.
    if project.tasks.filter(models.Q(assignee=user) | models.Q(reporter=user)).exists():
        # Only allow view/edit related permissions; membership management should remain explicit.
        if permission in {"view_project", "edit_project", "comment_project", "export_project"}:
            defaults = ProjectRole.DEFAULT_CAPABILITIES.get("editor", {})
            cap_key = CAPABILITY_MAP.get(permission)
            if cap_key:
                return bool(defaults.get(cap_key, False))
        # fall through for other permissions

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


def ensure_project_member(*, project, user, assigned_by, role: str = "editor") -> ProjectRole:
    """
    Ensure a user is an explicit member of a project (ProjectRole exists).

    Used to prevent "orphan" access when someone is assigned work on a project.
    """
    role_obj, created = ProjectRole.objects.get_or_create(
        project=project,
        user=user,
        defaults={"role": role, "assigned_by": assigned_by},
    )
    if created:
        sync_project_permissions(role_obj)
    return role_obj
