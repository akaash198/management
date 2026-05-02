import type { TeamMember } from "@/types";

export interface SprintCapacity {
  id: string;
  user: TeamMember["user"];
  capacity_hours: number;
  notes: string;
}

export interface Sprint {
  id: string;
  project: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  capacity_hours: number;
  status: "planned" | "active" | "completed";
  member_capacities: SprintCapacity[];
  planned_hours: number;
  planned_tasks: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  project: string;
  project_name: string;
  project_color: string;
  name: string;
  description: string;
  due_date: string;
  status: "planned" | "at_risk" | "completed";
  created_at: string;
}

export interface TaskLink {
  id: string;
  source_task: string;
  source_task_title: string;
  target_task: string;
  target_task_title: string;
  link_type: "blocks" | "blocked_by" | "duplicates" | "relates_to";
  created_at: string;
}

export interface SavedIssueView {
  id: string;
  team: string;
  user: string;
  name: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
  created_at: string;
}

export interface ProjectTemplate {
  id: string;
  team: string;
  name: string;
  description: string;
  color: string;
  icon: string | null;
  columns: Array<{ name: string; order?: number; color?: string | null; is_done_column?: boolean }>;
  labels: Array<{ name: string; color: string }>;
  default_issue_types: string[];
  default_roles: Array<{ user_id: string; role: string }>;
  created_at: string;
}

export interface RecurringTaskRule {
  id: string;
  project: string;
  project_name: string;
  column: string;
  column_name: string;
  assignee: TeamMember["user"] | null;
  title: string;
  description: string;
  issue_type: string;
  priority: string;
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  next_run_date: string;
  is_active: boolean;
  last_task: string | null;
  created_at: string;
}

export interface RoadmapOverview {
  projects: Array<{
    id: string;
    name: string;
    color: string;
    icon: string | null;
    open_tasks: number;
    overdue_tasks: number;
    next_due_date: string | null;
    forecast: "on_track" | "at_risk";
  }>;
  milestones: Milestone[];
  dependency_count: number;
}

export interface WorkloadRow {
  user: TeamMember["user"];
  role: TeamMember["role"];
  open_tasks: number;
  overdue_tasks: number;
  planned_hours: number;
  capacity_hours: number;
  imbalance: number;
}

export interface BulkTaskUpdateInput {
  task_ids: string[];
  updates: {
    assignee?: string | null;
    priority?: string;
    due_date?: string | null;
    column?: string;
    sprint?: string | null;
    issue_type?: string;
    archive?: boolean;
  };
}

export interface SprintWriteInput {
  project: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  capacity_hours: number;
  status: "planned" | "active" | "completed";
  capacities?: Array<{ user_id: string; capacity_hours: number; notes?: string }>;
}

export interface MilestoneWriteInput {
  project: string;
  name: string;
  description?: string;
  due_date: string;
  status: "planned" | "at_risk" | "completed";
}

export interface SavedIssueViewWriteInput {
  team: string;
  name: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
}

export interface ProjectTemplateWriteInput {
  team: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  columns: ProjectTemplate["columns"];
  labels: ProjectTemplate["labels"];
  default_issue_types: string[];
  default_roles: ProjectTemplate["default_roles"];
}

export interface RecurringTaskRuleWriteInput {
  project: string;
  column: string;
  assignee_id?: string | null;
  title: string;
  description?: string;
  issue_type: string;
  priority: string;
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  next_run_date: string;
  is_active: boolean;
}
