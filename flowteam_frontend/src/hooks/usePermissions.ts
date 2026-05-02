import { useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import type { Team } from "@/types";

export type TeamRole = "ceo" | "admin" | "manager" | "member" | "viewer";
export type ProjectRole = "project_admin" | "editor" | "commenter" | "viewer";

export type Capability =
  | "can_view"
  | "can_edit_tasks"
  | "can_delete_tasks"
  | "can_manage_project"
  | "can_delete_project"
  | "can_edit_columns"
  | "can_export"
  | "can_comment"
  | "can_manage_members";

// Default capabilities per project role (mirrors backend DEFAULT_CAPABILITIES)
const PROJECT_ROLE_CAPS: Record<ProjectRole, Record<Capability, boolean>> = {
  project_admin: {
    can_view: true,
    can_edit_tasks: true,
    can_delete_tasks: true,
    can_manage_project: true,
    can_delete_project: true,
    can_edit_columns: true,
    can_export: true,
    can_comment: true,
    can_manage_members: true,
  },
  editor: {
    can_view: true,
    can_edit_tasks: true,
    can_delete_tasks: false,
    can_manage_project: false,
    can_delete_project: false,
    can_edit_columns: false,
    can_export: true,
    can_comment: true,
    can_manage_members: false,
  },
  commenter: {
    can_view: true,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_manage_project: false,
    can_delete_project: false,
    can_edit_columns: false,
    can_export: false,
    can_comment: true,
    can_manage_members: false,
  },
  viewer: {
    can_view: true,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_manage_project: false,
    can_delete_project: false,
    can_edit_columns: false,
    can_export: false,
    can_comment: false,
    can_manage_members: false,
  },
};

// Which project roles a given project role can assign (mirrors backend ASSIGNABLE_ROLES)
const ASSIGNABLE_ROLES: Record<ProjectRole, ProjectRole[]> = {
  project_admin: ["project_admin", "editor", "commenter", "viewer"],
  editor: ["commenter", "viewer"],
  commenter: [],
  viewer: [],
};

export interface TeamPermissions {
  role: TeamRole | null;
  isSuperAdmin: boolean;
  isCEO: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isMember: boolean;
  isViewer: boolean;
  /** Can update team settings (name, etc.) */
  canManageTeam: boolean;
  /** Can invite new members */
  canInviteMembers: boolean;
  /** Can change another member's role */
  canChangeRoles: boolean;
  /** Can remove members */
  canRemoveMembers: boolean;
  /** Can delete the team entirely */
  canDeleteTeam: boolean;
  /** Can view audit logs */
  canViewAuditLog: boolean;
  /** Can create projects */
  canCreateProject: boolean;
}

export interface ProjectPermissions {
  role: ProjectRole | null;
  /** Resolved effective capabilities (role defaults merged with overrides) */
  capabilities: Record<Capability, boolean>;
  can: (cap: Capability) => boolean;
  /** Check if this user can assign a given project role to someone else */
  canAssignRole: (targetRole: ProjectRole) => boolean;
}

/** Hook for team-level RBAC checks based on active team */
export function useTeamPermissions(team?: Team | null): TeamPermissions {
  const { user } = useAuthStore();
  const { teams, activeTeamId } = useTeamStore();

  return useMemo(() => {
    const isSuperAdmin = !!user?.is_superuser;

    const resolvedTeam = team ?? teams.find((t) => t.id === activeTeamId) ?? null;
    const role = (resolvedTeam?.your_role ?? null) as TeamRole | null;

    const isCEO = role === "ceo" || isSuperAdmin;
    const isAdmin = role === "admin" || isCEO;
    const isManager = role === "manager" || isAdmin;
    const isMember = role === "member" || isManager;
    const isViewer = role === "viewer" || isMember;

    return {
      role,
      isSuperAdmin,
      isCEO,
      isAdmin,
      isManager,
      isMember,
      isViewer,
      canManageTeam: isAdmin,
      canInviteMembers: isManager,
      canChangeRoles: isAdmin,
      canRemoveMembers: isAdmin,
      canDeleteTeam: isCEO,
      canViewAuditLog: isAdmin,
      canCreateProject: isManager,
    };
  }, [user, team, teams, activeTeamId]);
}

/**
 * Hook for project-level RBAC checks.
 *
 * Pass `projectRole` as the role string returned by the backend
 * (`effective_capabilities` already merged), plus optional `capabilityOverrides`
 * for any custom capability flags.
 */
export function useProjectPermissions(
  projectRole: ProjectRole | null | undefined,
  capabilityOverrides?: Partial<Record<Capability, boolean>>
): ProjectPermissions {
  const { user } = useAuthStore();

  return useMemo(() => {
    if (user?.is_superuser) {
      const allCaps = Object.fromEntries(
        (Object.keys(PROJECT_ROLE_CAPS.project_admin) as Capability[]).map((k) => [k, true])
      ) as Record<Capability, boolean>;
      return {
        role: "project_admin",
        capabilities: allCaps,
        can: () => true,
        canAssignRole: () => true,
      };
    }

    const role = projectRole ?? null;
    const defaults = role ? PROJECT_ROLE_CAPS[role] : ({} as Record<Capability, boolean>);
    const capabilities: Record<Capability, boolean> = { ...defaults, ...capabilityOverrides } as Record<Capability, boolean>;

    return {
      role,
      capabilities,
      can: (cap: Capability) => !!capabilities[cap],
      canAssignRole: (targetRole: ProjectRole) =>
        role ? ASSIGNABLE_ROLES[role].includes(targetRole) : false,
    };
  }, [user, projectRole, capabilityOverrides]);
}

/** Convenience re-export — import everything from one place */
export const ALL_CAPABILITIES: Capability[] = [
  "can_view",
  "can_edit_tasks",
  "can_delete_tasks",
  "can_manage_project",
  "can_delete_project",
  "can_edit_columns",
  "can_export",
  "can_comment",
  "can_manage_members",
];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  can_view: "View project",
  can_edit_tasks: "Edit tasks",
  can_delete_tasks: "Delete tasks",
  can_manage_project: "Manage project settings",
  can_delete_project: "Delete project",
  can_edit_columns: "Edit board columns",
  can_export: "Export data",
  can_comment: "Comment on tasks",
  can_manage_members: "Manage project members",
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  project_admin: "Project Admin",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  ceo: "CEO",
  admin: "Admin",
  manager: "Manager",
  member: "Employee",
  viewer: "Viewer",
};
