import { SlimUser, Message } from "./messaging";
import type { Project } from "./project";
import type { Task, TaskPriority } from "./task";

export interface ProjectProgress extends Project {
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
  overdue_count: number;
  members: SlimUser[];
}

export interface ActivityItem {
  id: string;
  actor: SlimUser;
  verb: string;
  task_title: string;
  task_id: string;
  project_name: string;
  project_id: string;
  detail: any;
  created_at: string;
}

export interface DashboardData {
  my_tasks: {
    total: number;
    overdue: number;
    due_today: number;
    due_this_week: number;
    by_priority: Record<TaskPriority, number>;
    recent: Task[];
  };
  projects: {
    total: number;
    active: number;
    items: ProjectProgress[];
  };
  activity: ActivityItem[];
  team_stats: {
    total_members: number;
    tasks_completed_this_week: number;
    tasks_created_this_week: number;
    most_active_member: SlimUser | null;
  };
  quick_links: Project[];
}

export interface CalendarTask {
  id: string;
  title: string;
  due_date: string;
  priority: TaskPriority;
  project_id: string;
  project_name: string;
  project_color: string;
  assignee: SlimUser | null;
  column_name: string;
  is_done: boolean;
  is_overdue: boolean;
}

export interface SearchResults {
  query: string;
  results: {
    tasks?: { items: CalendarTask[]; total: number };
    messages?: { items: any[]; total: number };
    members?: { items: any[]; total: number };
    projects?: { items: Project[]; total: number };
  };
  took_ms: number;
}

export interface WorkloadMember {
  user: SlimUser;
  total_assigned: number;
  by_status: Record<string, number>;
  by_priority: Record<TaskPriority, number>;
  overdue: number;
  completion_rate_7d: number;
}
