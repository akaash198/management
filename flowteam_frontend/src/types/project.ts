import { SlimUser } from "./messaging";

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  team?: string;
  team_name?: string;
  color: string;
  icon: string | null;
  status: ProjectStatus;
  task_count: number;
  completed_task_count: number;
  overdue_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  name: string;
  order: number;
  color: string | null;
  is_done_column: boolean;
  task_count: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface ProjectDetail extends Project {
  columns: Column[];
  labels: Label[];
  my_role?: ProjectRoleType | null;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  team: string;
  color: string;
  icon?: string;
  template_id?: string;
}

export type ProjectRoleType = "project_admin" | "editor" | "commenter" | "viewer";

export interface ProjectRole {
  id: string;
  project: string;
  user: SlimUser;
  role: ProjectRoleType;
  capabilities: Record<string, boolean>;
  effective_capabilities: Record<string, boolean>;
  is_active: boolean;
  assigned_by: SlimUser;
  assigned_at: string;
  valid_from: string | null;
  valid_until: string | null;
}
