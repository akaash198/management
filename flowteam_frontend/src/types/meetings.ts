import type { SlimUser } from "./messaging";

export type MeetingCallType = "audio" | "video";
export type MeetingStatus = "scheduled" | "active" | "ended" | "cancelled";

export interface Meeting {
  id: string;
  team: string;
  title: string;
  description: string;
  call_type: MeetingCallType;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: MeetingStatus;
  is_instant: boolean;
  channel_id: string;
  active_call_id?: string | null;
  attendees?: SlimUser[];
  created_by?: SlimUser;
  created_at?: string;
  updated_at?: string;
}

export type MeetingRecordingStatus = "uploaded" | "transcribing" | "transcribed" | "failed";

export interface MeetingRecording {
  id: string;
  meeting: string;
  audio_file: string | null;
  mime_type: string;
  duration_seconds: number;
  status: MeetingRecordingStatus;
  error: string;
  transcript_text: string;
  action_items: Record<string, unknown>;
  ai_summary: string;
  created_by?: SlimUser | null;
  created_at: string;
  updated_at: string;
}
