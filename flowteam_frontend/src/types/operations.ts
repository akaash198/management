import type { User } from "@/types";

export interface Approval {
  id: string;
  project: string;
  project_name: string;
  task: string | null;
  task_title: string;
  title: string;
  description: string;
  target_type: "task" | "release";
  required_role: string;
  status: "pending" | "approved" | "rejected";
  requested_by: User;
  decided_by: User | null;
  decision_note: string;
  created_at: string;
  decided_at: string | null;
}

export interface ActivityFeedItem {
  id: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  actor: User | null;
  verb: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AdvancedReporting {
  lead_time_days: number;
  cycle_time_days: number;
  throughput: number;
  created_count: number;
  completed_count: number;
  overdue_count: number;
  overdue_trend: Array<{ date: string; count: number }>;
  sprint_burndown: Array<{ sprint: string; planned_tasks: number; completed_tasks: number }>;
  team_velocity: Array<{ sprint: string; completed: number; planned: number }>;
}

export interface ProjectDocument {
  id: string;
  project: string;
  project_name: string;
  task: string | null;
  task_title: string;
  parent_document: string | null;
  title: string;
  doc_type: "sop" | "spec" | "meeting" | "decision" | "note";
  content: string;
  attachment_url: string;
  version: number;
  created_by: User;
  created_at: string;
}

export interface NotificationRule {
  id: string;
  project: string;
  name: string;
  trigger: string;
  filters: Record<string, unknown>;
  delivery: "in_app" | "email" | "both";
  is_active: boolean;
  created_at: string;
}

export interface IssueFieldDefinition {
  id: string;
  project: string;
  issue_type: string;
  name: string;
  field_type: "text" | "number" | "date" | "select";
  is_required: boolean;
  options: string[];
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  task: string;
  field_definition: IssueFieldDefinition;
  value: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  project: string;
  name: string;
  trigger: "task_done" | "task_overdue" | "approval_requested";
  conditions: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  is_active: boolean;
  created_at: string;
}

export interface ClientPortalAccess {
  id: string;
  project: string;
  project_name: string;
  email: string;
  display_name: string;
  allowed_statuses: string[];
  allowed_document_ids: string[];
  status: "active" | "revoked";
  portal_url: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  email_enabled: boolean;
  due_reminders_enabled: boolean;
  overdue_digest_enabled: boolean;
  watch_notifications_enabled: boolean;
  approval_notifications_enabled: boolean;
}

export interface NotificationDigestPreview {
  overdue_tasks: number;
  overdue_items: Array<{ id: string; title: string; project_id: string }>;
  pending_approvals: number;
  watching_count: number;
}
