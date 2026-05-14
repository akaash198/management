import { SlimUser } from "./messaging";
import { Label } from "./project";

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project: string;
  project_name?: string;
  project_color?: string;
  project_icon?: string | null;
  project_team_id?: string;
  column: string;
  column_name?: string;
  assignee: SlimUser | null;
  assignees?: SlimUser[];
  reporter: SlimUser;
  issue_type?: "epic" | "story" | "task" | "bug" | "subtask";
  priority: TaskPriority;
  start_date?: string | null;
  due_date: string | null;
  order: number;
  sprint?: string | null;
  sprint_name?: string;
  parent_task_id?: string | null;
  labels: Label[];
  is_archived: boolean;
  is_overdue: boolean;
  subtasks_count: number;
  attachments_count: number;
  estimated_hours: number | null;
  epic?: string | null;
  epic_details?: {
    id: string;
    title: string;
    status: string;
    color: string;
  } | null;
  resolution_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubTask {
  id: string;
  title: string;
  is_completed: boolean;
  order: number;
}

export interface Attachment {
  id: string;
  url: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: SlimUser;
  uploaded_at: string;
}

export interface TaskActivity {
  id: string;
  actor: SlimUser;
  verb: "created" | "updated" | "moved" | "assigned" | "commented" | "completed";
  detail: Record<string, unknown>;
  created_at: string;
}

export interface TimeLog {
  id: string;
  task: string;
  user: SlimUser;
  minutes: number;
  hours_display: string;
  date: string;
  note: string | null;
  is_billable?: boolean;
  hourly_rate_cents?: number;
  billed_invoice?: string | null;
  created_at: string;
}

export interface TaskDetail extends Task {
  subtasks: SubTask[];
  attachments: Attachment[];
  activities: TaskActivity[];
  timelogs: TimeLog[];
  total_logged_minutes: number;
  total_logged_display: string;
}

export interface TaskFilters {
  project_id?: string;
  team_id?: string;
  column_id?: string;
  assignee_id?: string;
  priority?: TaskPriority;
  due?: "overdue" | "today" | "this_week";
  search?: string;
  status?: "open" | "done";
  epic_id?: string;
}

export interface Epic {
  id: string;
  project: string;
  owner: SlimUser;
  title: string;
  description: string | null;
  status: "backlog" | "discovery" | "wip" | "review" | "done";
  color: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Retrospective {
  id: string;
  team: string;
  sprint: string | null;
  title: string;
  date: string;
  created_by: SlimUser;
  items?: RetroItem[];
  created_at: string;
}

export interface RetroItem {
  id: string;
  retrospective: string;
  item_type: "keep" | "improve" | "discussion";
  text: string;
  submitter: SlimUser;
  vote_count: number;
  has_voted: boolean;
  created_at: string;
}

export interface TaskMutationInput {
  title: string;
  description?: string;
  project: string;
  column: string;
  assignee?: string | null;
  assignee_ids?: string[];
  sprint?: string | null;
  parent_task?: string | null;
  issue_type?: "epic" | "story" | "task" | "bug" | "subtask";
  priority: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  order?: number;
}

export type TaskMutationPatch = Partial<TaskMutationInput>;

export interface TaskWatcher {
  id: string;
  task: string;
  user: SlimUser;
  created_at: string;
}

export interface MissedMessagesSummary {
  total_unread: number;
  since: string;
  channels: {
    channel_id: string;
    channel_name: string;
    unread_count: number;
    last_message: {
      text: string;
      sender: string;
      created_at: string;
    } | null;
  }[];
}
