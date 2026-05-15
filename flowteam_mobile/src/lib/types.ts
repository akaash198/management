export type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_superuser?: boolean;
};

export type Team = {
  id: string;
  name: string;
  slug?: string;
  your_role?: string;
  my_role?: string;
  avatar_url?: string | null;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  color?: string;
  icon?: string | null;
  status?: string;
  team?: string;
  team_name?: string;
  task_count?: number;
  completed_task_count?: number;
  overdue_count?: number;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
  // Fallbacks for UI if still needed
  progress?: number;
  due_date?: string | null;
  deadline?: string | null;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  project?: string;
  project_name?: string;
  project_color?: string;
  project_icon?: string | null;
  column?: string;
  column_name?: string;
  priority?: "low" | "normal" | "high" | "urgent" | string;
  due_date?: string | null;
  start_date?: string | null;
  assignee?: User | null;
  assignees?: User[];
  reporter?: User;
  is_overdue?: boolean;
  order?: number;
  estimated_hours?: string | number | null;
  created_at?: string;
  updated_at?: string;
  issue_type?: string;
  
  // Legacy / UI fallback fields
  status?: string;
  assignee_name?: string | null;
};

export type Channel = {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  is_private?: boolean;
  unread_count?: number;
  last_message?: {
    text?: string;
    created_at?: string | null;
  } | null;
  last_message_text?: string;
  last_message_at?: string | null;
  dm_other_user_id?: string | null;
  is_muted?: boolean;
  mute_until?: string | null;
  notification_level?: "all" | "mentions" | "mute" | string;
  notification_keywords?: string[];
};

export type Message = {
  id: string;
  seq?: number;
  client_id?: string;
  channel?: string;
  text: string;
  mentions?: string[];
  parent_id?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  is_system?: boolean;
  meta?: { event?: string; call_type?: string; duration?: number | null } | null;
  created_at?: string | null;
  sender_id?: string | null;
  sender?: { id: string; full_name: string; avatar?: string | null } | null;
  reactions?: Array<{ emoji: string; count: number; reacted_by_me: boolean }>;
  reply_count?: number;
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
    content_type: string;
    size: number;
    created_at?: string | null;
  }>;
  pending?: boolean;
  failed?: boolean;
};

export type CalendarItem = {
  id: string;
  title: string;
  kind: "task" | "meeting" | "deadline" | "event" | "external";
  starts_at?: string;
  due_date?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  is_read?: boolean;
  created_at?: string;
  type?: string;
  reference_type?: string;
  reference_id?: string;
};

export type TeamMember = {
  id: string;
  user: User;
  role: "CEO" | "Admin" | "Manager" | "Member" | "Viewer" | string;
  joined_at?: string;
};

export type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  starts_at?: string;
  organizer?: User | null;
  attendees?: User[];
  attendee_count?: number;
  status?: "upcoming" | "ongoing" | "completed" | string;
  notes?: string | null;
  has_recording?: boolean;
};

export type Sprint = {
  id: string;
  name: string;
  goal?: string | null;
  start_date?: string;
  end_date?: string;
  status?: "planned" | "active" | "completed" | string;
  capacity_hours?: number;
  project?: string;
};

export type Column = {
  id: string;
  name: string;
  order?: number;
  is_done_column?: boolean;
  project?: string;
  task_count?: number;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  project: string;
  column?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  due_date?: string | null;
  assignee?: string | null;
  issue_type?: string;
  sprint?: string | null;
  story_points?: number | null;
};

export type UpdateTaskPayload = Partial<CreateTaskPayload> & {
  column?: string;
  status?: string;
};

export type Presence = {
  user_id: string;
  status: "online" | "away" | "offline";
  custom_status?: string | null;
  custom_status_emoji?: string | null;
};
