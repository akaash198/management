import type { TaskPriority } from "./task";
import type { TeamRoleSlug, User } from "./index";

export interface VelocityWeek {
  week_start: string;
  week_end: string;
  completed: number;
  created: number;
  net: number;
}

export interface BurndownPoint {
  date: string;
  open_tasks: number;
  completed_tasks: number;
  ideal: number;
}

export interface MemberStat {
  user: User;
  team_role?: TeamRoleSlug;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_overdue: number;
  completion_rate: number;
  avg_completion_days: number;
  total_hours_logged: number;
  tasks_by_priority: { priority: TaskPriority; count: number }[];
}

export interface ProjectHealth {
  health_score: number;
  health_label: "Healthy" | "At Risk" | "Critical";
  factors: {
    overdue_rate: number;
    unassigned_rate: number;
    activity_score: number;
  };
  recommendations: string[];
}
