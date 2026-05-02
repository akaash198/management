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

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  plan: "free" | "pro" | "ai" | string;
  ai_enabled: boolean;
  member_count: number;
  your_role: "ceo" | "admin" | "manager" | "member" | "viewer";
}

export interface TeamMember {
  id: string;
  user: User;
  role: "ceo" | "admin" | "manager" | "member" | "viewer";
  joined_at: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  is_accepted: boolean;
}

export interface TeamCapabilities {
  role: "ceo" | "admin" | "manager" | "member" | "viewer" | null;
  can_manage_team: boolean;
  can_invite_members: boolean;
  can_change_roles: boolean;
  can_remove_members: boolean;
  can_delete_team: boolean;
  can_view_audit_log: boolean;
  can_create_project: boolean;
  assignable_invite_roles: Array<"ceo" | "admin" | "manager" | "member" | "viewer">;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: any;
}
