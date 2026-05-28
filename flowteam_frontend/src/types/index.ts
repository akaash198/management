export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone?: string;
  is_email_verified?: boolean;
  two_factor_enabled?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export type TeamRoleSlug = "ceo" | "admin" | "manager" | "member" | "viewer";

export interface CustomRole {
  id: string;
  name: string;
  slug: string;
  level: number;
  is_owner_role: boolean;
  is_system: boolean;
  capabilities: Record<string, boolean>;
  member_count: number;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  plan: "free" | "pro" | "ai" | string;
  ai_enabled: boolean;
  company_id: string | null;
  company_name: string | null;
  member_count: number;
  your_role: TeamRoleSlug;
  your_custom_role: CustomRole | null;
}

export interface TeamMember {
  id: string;
  user: User;
  role: TeamRoleSlug;
  custom_role: CustomRole | null;
  permissions_json: Record<string, boolean> | null;
  joined_at: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  custom_role: CustomRole | null;
  created_at: string;
  is_accepted: boolean;
}

export interface TeamCapabilities {
  role: TeamRoleSlug | null;
  custom_role_id: string | null;
  custom_role_name: string | null;
  is_owner_role: boolean;
  can_manage_team: boolean;
  can_invite_members: boolean;
  can_change_roles: boolean;
  can_remove_members: boolean;
  can_delete_team: boolean;
  can_view_audit_log: boolean;
  can_create_project: boolean;
  can_manage_billing: boolean;
  can_access_reports: boolean;
  can_manage_integrations: boolean;
  assignable_invite_roles: TeamRoleSlug[];
  assignable_custom_role_ids: string[];
}

export interface MemberPermissions {
  role_name: string;
  role_capabilities: Record<string, boolean>;
  overrides: Record<string, boolean>;
  resolved: Record<string, boolean>;
}

export type CompanyRole = "ceo" | "admin" | "manager" | "member" | "viewer";

export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string;
  industry: string;
  size: string;
  country: string;
  logo_url: string | null;
  email_domain: string;
  email_domain_verified: boolean;
  onboarding_status: "pending" | "in_progress" | "active" | "suspended";
  onboarding_completed_at: string | null;
  team_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
  ceo: { id: string; email: string; full_name: string } | null;
  your_role?: CompanyRole | "superuser" | null;
}

export interface CompanyDetail extends Company {
  teams: Team[];
  settings_json: Record<string, unknown>;
  pending_invites_count: number;
}

export interface CompanyMember {
  id: string;
  user: { id: string; email: string; full_name: string };
  role: CompanyRole;
  joined_at: string;
}

export interface CompanyInvite {
  id: string;
  email: string;
  role: CompanyRole;
  status: "pending" | "accepted" | "expired";
  invited_by: { id: string; email: string; full_name: string } | null;
  invite_link: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

export interface CompanyCapabilities {
  role: CompanyRole | "superuser" | null;
  can_manage_company: boolean;
  can_invite_members: boolean;
  can_change_roles: boolean;
  can_remove_members: boolean;
  can_create_teams: boolean;
  can_view_members: boolean;
  assignable_invite_roles: CompanyRole[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: any;
}
