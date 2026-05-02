export interface Channel {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_private: boolean;
  unread_count: number;
  last_message?: Message;
  /** For 1:1 private channels, backend may include the other user's id for presence indicators. */
  dm_other_user_id?: string | null;
  is_muted?: boolean;
  mute_until?: string | null;
  notification_level?: "all" | "mentions" | "mute";
  notification_keywords?: string[];
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  size: number;
  created_at?: string | null;
}

export interface MessagePin {
  id: string;
  message: Message;
  pinned_by: SlimUser;
  created_at: string;
}

export interface MessageSave {
  id: string;
  message: Message;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  sender: SlimUser;
  text: string;
  parent_id: string | null;
  send_at: string;
  sent_at?: string | null;
  created_at: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface Message {
  id: string;
  /**
   * Optional client-generated id echoed back by the websocket server
   * to support optimistic UI. Not persisted server-side.
   */
  client_id?: string;
  sender: SlimUser;
  text: string;
  mentions: string[];
  parent_id: string | null;
  is_edited: boolean;
  edited_at?: string | null;
  is_deleted: boolean;
  deleted_by?: SlimUser | null;
  created_at: string;
  reactions: Reaction[];
  reply_count: number;
  attachments?: Attachment[];
  is_system?: boolean;
  meta?: { event?: string; call_type?: string; duration?: number | null } | null;
  /**
   * Local-only flag used for pending optimistic messages.
   */
  pending?: boolean;
  /**
   * Local-only flag used when an optimistic message could not be sent.
   */
  failed?: boolean;
}

export interface SlimUser {
  id: string;
  full_name: string;
  avatar: string | null;
  role?: string;
}

export interface ChannelReadState {
  user: SlimUser;
  last_read_at: string;
}

export interface MessageEdit {
  id: string;
  edited_by: SlimUser;
  old_text: string;
  new_text: string;
  created_at: string;
}

export interface Comment {
  id: string;
  author: SlimUser;
  text: string;
  parent: string | null;
  mentions: string[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  replies?: Comment[];
}

export type NotificationType = 
  | "task_assigned" 
  | "task_due" 
  | "task_overdue"
  | "task_watched"
  | "approval_requested"
  | "approval_decided"
  | "automation_notice"
  | "mentioned_message" 
  | "mentioned_comment" 
  | "task_moved" 
  | "task_completed" 
  | "invite_accepted";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  reference_type: "task" | "message" | "comment" | "invite";
  reference_id: string;
  action_url?: string;
  delivery_channel?: "in_app" | "email" | "both";
  is_read: boolean;
  created_at: string;
}

export interface TypingUser {
  user_id: string;
  user_name: string;
  is_typing: boolean;
}
