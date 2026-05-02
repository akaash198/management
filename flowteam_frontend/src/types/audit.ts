import type { SlimUser } from "./messaging";

export interface AuditLog {
  id: string;
  actor: SlimUser | null;
  action: string;
  model_name: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, [any, any]>;
  ip_address: string;
  user_agent: string;
  team: string;
  created_at: string;
}
