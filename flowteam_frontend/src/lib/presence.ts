export type UserPresenceStatus = "online" | "away" | "busy" | "dnd" | "offline";

export const PRESENCE_META: Record<
  UserPresenceStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  online: {
    label: "Online",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600",
  },
  away: {
    label: "Away",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600",
  },
  busy: {
    label: "Busy",
    dotClass: "bg-rose-500",
    textClass: "text-rose-600",
  },
  dnd: {
    label: "Do not disturb",
    dotClass: "bg-violet-500",
    textClass: "text-violet-600",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-slate-400",
    textClass: "text-slate-500",
  },
};

export const PRESENCE_OPTIONS: UserPresenceStatus[] = ["online", "away", "busy", "dnd", "offline"];
