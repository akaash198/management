"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock, Copy, Pencil, Plus, Search, Video,
  Phone, Clock, Users, Zap, CalendarDays, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowUpRight, XCircle, Radio,
} from "lucide-react";
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, startOfWeek, addDays, isSameDay, isValid, isPast, subMinutes, isWithinInterval } from "date-fns";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { Meeting } from "@/types/meetings";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { EditMeetingDialog } from "@/components/meetings/EditMeetingDialog";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function dateOnly(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isValid(d) ? d : null;
}

function getMeetingPhase(m: Meeting): "live" | "upcoming" | "past" | "cancelled" {
  if (m.status === "cancelled") return "cancelled";
  const starts = safeDate(m.starts_at);
  if (!starts) return "upcoming";
  const ends = new Date(starts.getTime() + m.duration_minutes * 60_000);
  const now = new Date();
  if (isWithinInterval(now, { start: subMinutes(starts, 5), end: ends })) return "live";
  if (isPast(ends)) return "past";
  return "upcoming";
}

function friendlyDay(d: Date): string {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MeetingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeTeamId, fetchTeams } = useTeamStore();
  const user = useAuthStore((s) => s.user);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultMode, setCreateDefaultMode] = useState<"instant" | "schedule">("schedule");
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "upcoming" | "past" | "cancelled">("upcoming");
  const [weekOffset, setWeekOffset] = useState(0);
  const [creatingInstant, setCreatingInstant] = useState(false);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 30);
    const end = new Date(now); end.setDate(end.getDate() + 60);
    return { start: dateOnly(start), end: dateOnly(end) };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["meetings", activeTeamId, range],
    queryFn: async () => {
      const qs = new URLSearchParams({ start: range.start, end: range.end });
      const res = await api.get<ApiResponse<Meeting[]>>(`/meetings/teams/${activeTeamId}/meetings/?${qs.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeTeamId,
    staleTime: 30_000,
  });

  const allMeetings = data ?? [];

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = allMeetings.filter((m) => {
      const s = safeDate(m.starts_at);
      return s && s.getTime() > now && m.status !== "cancelled";
    }).length;
    const todayCount = allMeetings.filter((m) => {
      const s = safeDate(m.starts_at);
      return s && isToday(s) && m.status !== "cancelled";
    }).length;
    const live = allMeetings.filter((m) => getMeetingPhase(m) === "live").length;
    return { upcoming, todayCount, live };
  }, [allMeetings]);

  // Week strip
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of allMeetings) {
      const s = safeDate(m.starts_at);
      if (!s) continue;
      const key = dateOnly(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [allMeetings]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Auto-navigate weekOffset to selectedDay's week
  useEffect(() => {
    if (selectedDay) {
      const base = startOfWeek(new Date(), { weekStartsOn: 1 });
      const targetStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
      const diffTime = targetStart.getTime() - base.getTime();
      const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
      setWeekOffset(diffWeeks);
    }
  }, [selectedDay]);

  // Filtered + grouped meetings
  const filtered = useMemo(() => {
    const now = Date.now();
    let list = allMeetings;

    if (q.trim()) {
      const lq = q.trim().toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(lq) || m.description?.toLowerCase().includes(lq));
    }

    if (selectedDay) {
      list = list.filter((m) => { const s = safeDate(m.starts_at); return s && isSameDay(s, selectedDay); });
    }

    if (statusFilter === "live") list = list.filter((m) => getMeetingPhase(m) === "live");
    if (statusFilter === "upcoming") list = list.filter((m) => {
      const s = safeDate(m.starts_at);
      return s && s.getTime() >= now && m.status !== "cancelled";
    });
    if (statusFilter === "past") list = list.filter((m) => {
      const s = safeDate(m.starts_at);
      return s && s.getTime() < now;
    });
    if (statusFilter === "cancelled") list = list.filter((m) => m.status === "cancelled");

    return list.sort((a, b) => {
      const sa = safeDate(a.starts_at)?.getTime() ?? 0;
      const sb = safeDate(b.starts_at)?.getTime() ?? 0;
      return statusFilter === "past" ? sb - sa : sa - sb;
    });
  }, [allMeetings, q, statusFilter, selectedDay]);

  // Group by day
  const grouped = useMemo(() => {
    const groups = new Map<string, Meeting[]>();
    for (const m of filtered) {
      const s = safeDate(m.starts_at);
      const key = s ? dateOnly(s) : "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return groups;
  }, [filtered]);

  // Next upcoming meeting
  const nextUp = useMemo(() => {
    const now = Date.now();
    return allMeetings
      .filter((m) => { const s = safeDate(m.starts_at); return s && s.getTime() > now && m.status !== "cancelled"; })
      .sort((a, b) => (safeDate(a.starts_at)?.getTime() ?? 0) - (safeDate(b.starts_at)?.getTime() ?? 0))[0] ?? null;
  }, [allMeetings]);

  const createInstant = async () => {
    if (!activeTeamId) return toast.error("Select a team first.");
    setCreatingInstant(true);
    try {
      const res = await api.post<ApiResponse<Meeting>>(`/meetings/teams/${activeTeamId}/meetings/instant/`, {
        title: "Instant meeting",
        call_type: "video",
      });
      if (!res.data.success) throw new Error(res.data.error ?? "Failed");
      toast.success("Instant meeting created");
      router.push(`/meetings/${res.data.data.id}`);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to create instant meeting"));
    } finally {
      setCreatingInstant(false);
    }
  };

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meetings/${id}`);
      toast.success("Link copied");
    } catch { toast.error("Copy failed"); }
  };

  const cancelMeeting = async (m: Meeting) => {
    if (!confirm(`Cancel "${m.title}"?`)) return;
    try {
      await api.patch(`/meetings/${m.id}/`, { status: "cancelled" });
      toast.success("Meeting cancelled");
      qc.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) { toast.error(toErrorMessage(err, "Failed to cancel meeting")); }
  };

  return (
    <div className="max-w-[1100px] mx-auto p-4 sm:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-foreground">Meetings</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Schedule calls, run standups, and review recordings.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[12.5px] gap-1.5 flex-1 sm:flex-none"
            onClick={() => { setCreateDefaultMode("instant"); setCreateOpen(true); }}
            disabled={!activeTeamId}
          >
            <Zap size={13} />Instant
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-[13px] gap-1.5 flex-1 sm:flex-none"
            onClick={() => { setCreateDefaultMode("schedule"); setCreateOpen(true); }}
            disabled={!activeTeamId}
          >
            <Plus size={14} />Schedule
          </Button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={cn(
          "rounded-xl border bg-card px-4 py-3 flex items-center gap-3 shadow-sm",
          stats.live > 0 ? "border-green-300/60 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/20" : "border-border"
        )}>
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
            stats.live > 0 ? "bg-green-100 dark:bg-green-900/40" : "bg-muted/50"
          )}>
            <Radio size={16} className={stats.live > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Live now</p>
            <p className={cn("text-[22px] font-bold leading-tight", stats.live > 0 ? "text-green-600 dark:text-green-400" : "text-foreground")}>
              {stats.live}
            </p>
          </div>
          {stats.live > 0 && (
            <span className="ml-auto text-[10px] font-bold text-green-600 dark:text-green-400 animate-pulse">● Live</span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <CalendarDays size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Today</p>
            <p className="text-[22px] font-bold leading-tight text-foreground">{stats.todayCount}</p>
          </div>
          <span className="ml-auto text-[11px] text-muted-foreground/60">{stats.todayCount === 1 ? "meeting" : "meetings"}</span>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40 shrink-0">
            <CalendarClock size={16} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Upcoming</p>
            <p className="text-[22px] font-bold leading-tight text-foreground">{stats.upcoming}</p>
          </div>
          <span className="ml-auto text-[11px] text-muted-foreground/60">scheduled</span>
        </div>
      </div>

      {/* ── Next up hero ── */}
      {nextUp && getMeetingPhase(nextUp) !== "past" && (
        <div className={cn(
          "rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5",
          getMeetingPhase(nextUp) === "live"
            ? "border-green-300/60 dark:border-green-800/40 bg-green-50/40 dark:bg-green-950/20"
            : "border-primary/20 bg-primary/5"
        )}>
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            getMeetingPhase(nextUp) === "live" ? "bg-green-100 dark:bg-green-900/40" : "bg-primary/10"
          )}>
            {nextUp.call_type === "video"
              ? <Video size={22} className={getMeetingPhase(nextUp) === "live" ? "text-green-600 dark:text-green-400" : "text-primary"} />
              : <Phone size={22} className={getMeetingPhase(nextUp) === "live" ? "text-green-600 dark:text-green-400" : "text-primary"} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {getMeetingPhase(nextUp) === "live" && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Live
                </span>
              )}
              <p className="text-[14px] font-bold truncate">{nextUp.title}</p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              {nextUp.starts_at ? (
                getMeetingPhase(nextUp) === "live"
                  ? `Started ${formatDistanceToNowStrict(new Date(nextUp.starts_at), { addSuffix: true })} · ${nextUp.duration_minutes} min`
                  : `${friendlyDay(new Date(nextUp.starts_at))} at ${format(new Date(nextUp.starts_at), "h:mm a")} · ${nextUp.duration_minutes} min · ${formatDistanceToNowStrict(new Date(nextUp.starts_at), { addSuffix: true })}`
              ) : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto shrink-0 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[12px] gap-1.5 flex-1 sm:flex-none" onClick={() => copyLink(nextUp.id)}>
              <Copy size={12} />Copy link
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-8 px-3 text-[12.5px] gap-1.5 flex-1 sm:flex-none",
                getMeetingPhase(nextUp) === "live" && "bg-green-600 hover:bg-green-700 shadow-[0_0_12px_rgba(22,163,74,0.3)]"
              )}
              onClick={() => router.push(`/meetings/${nextUp.id}`)}
            >
              {getMeetingPhase(nextUp) === "live" ? <><Radio size={12} />Join now</> : <><ArrowUpRight size={12} />Open</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Week strip ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/10">
          <p className="text-[11px] sm:text-[12px] font-semibold text-muted-foreground">
            Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
          <div className="flex items-center gap-1">
            {selectedDay && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground" onClick={() => setSelectedDay(null)}>
                Clear
              </Button>
            )}
            <button onClick={() => setWeekOffset((w) => w - 1)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => { setWeekOffset(0); setSelectedDay(null); }} className="h-6 px-2 rounded text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Today
            </button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[420px]">
          {weekDays.map((day) => {
            const key = dateOnly(day);
            const dayMeetings = meetingsByDay.get(key) ?? [];
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const todayDay = isToday(day);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay((prev) => prev && isSameDay(prev, day) ? null : day)}
                className={cn(
                  "flex flex-col items-center py-3 gap-1.5 transition-colors border-r last:border-r-0 border-border/40",
                  isSelected ? "bg-primary/10" : todayDay ? "bg-muted/30" : "hover:bg-muted/20"
                )}
              >
                <span className={cn("text-[10.5px] font-semibold uppercase tracking-wide", todayDay ? "text-primary" : "text-muted-foreground/60")}>
                  {format(day, "EEE")}
                </span>
                <span className={cn(
                  "text-[15px] font-bold w-7 h-7 rounded-full flex items-center justify-center",
                  isSelected ? "bg-primary text-primary-foreground" : todayDay ? "text-primary" : "text-foreground"
                )}>
                  {format(day, "d")}
                </span>
                {dayMeetings.length > 0 ? (
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[40px]">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <span
                        key={m.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          m.status === "cancelled" ? "bg-muted-foreground/30" :
                          getMeetingPhase(m) === "live" ? "bg-green-500" :
                          m.call_type === "video" ? "bg-primary" : "bg-violet-500"
                        )}
                      />
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="text-[9px] text-muted-foreground/60">+{dayMeetings.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <div className="h-3" />
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search meetings…"
            className="pl-9 h-9 text-[13px] bg-card"
          />
        </div>
        <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5 overflow-x-auto">
          {(["live", "upcoming", "all", "past", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-3 h-7 text-[12px] font-semibold capitalize transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Meeting list ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-6 w-16 bg-muted rounded hidden sm:block shrink-0" />
              <div className="h-7 w-12 bg-muted rounded shrink-0" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border text-center">
          <CalendarDays size={28} className="text-muted-foreground/30 mb-3" />
          <p className="text-[14px] font-medium text-muted-foreground">No meetings found</p>
          <p className="text-[12.5px] text-muted-foreground/60 mt-1">
            {q ? "Try a different search term" : "Schedule one to get started"}
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)} disabled={!activeTeamId}>
            <Plus size={14} />Schedule meeting
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([dateKey, dayMeetings]) => {
            const dayDate = safeDate(dateKey);
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-2">
                  {dayDate ? (
                    <button
                      onClick={() => setSelectedDay(dayDate)}
                      className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      {friendlyDay(dayDate)}
                    </button>
                  ) : (
                    <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                      {dateKey}
                    </p>
                  )}
                  <span className="text-[11px] text-muted-foreground/50 font-medium">
                    {dayDate ? format(dayDate, "MMMM d, yyyy") : ""}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[11px] text-muted-foreground/50">{dayMeetings.length} meeting{dayMeetings.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {dayMeetings.map((m) => (
                    <MeetingRow
                      key={m.id}
                      meeting={m}
                      currentUserId={user?.id}
                      onOpen={() => router.push(`/meetings/${m.id}`)}
                      onEdit={() => { setEditTarget(m); setEditOpen(true); }}
                      onCopy={() => copyLink(m.id)}
                      onCancel={() => cancelMeeting(m)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateMeetingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teamId={activeTeamId ?? null}
        defaultMode={createDefaultMode}
        redirectToMeeting
        onCreated={() => qc.invalidateQueries({ queryKey: ["meetings"] })}
      />
      <EditMeetingDialog
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTarget(null); }}
        teamId={activeTeamId ?? null}
        meeting={editTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ["meetings"] })}
      />
    </div>
  );
}

/* ── Meeting Row ────────────────────────────────────────────── */

function MeetingRow({
  meeting, currentUserId, onOpen, onEdit, onCopy, onCancel,
}: {
  meeting: Meeting;
  currentUserId?: string;
  onOpen: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onCancel: () => void;
}) {
  const phase = getMeetingPhase(meeting);
  const starts = safeDate(meeting.starts_at);
  const isHost = meeting.created_by?.id === currentUserId;
  const attendees = meeting.attendees ?? [];

  const phaseConfig = {
    live:      { dot: "bg-green-500 animate-pulse", badge: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200/60 dark:border-green-800/40", label: "Live" },
    upcoming:  { dot: "bg-primary", badge: "text-primary bg-primary/10 border-primary/20", label: "Upcoming" },
    past:      { dot: "bg-muted-foreground/30", badge: "text-muted-foreground bg-muted/40 border-border", label: "Ended" },
    cancelled: { dot: "bg-destructive/40", badge: "text-destructive bg-destructive/10 border-destructive/20", label: "Cancelled" },
  }[phase];

  return (
    <div className={cn(
      "group rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
      phase === "live" ? "border-green-300/60 dark:border-green-800/40" :
      phase === "cancelled" ? "border-border opacity-60" : "border-border"
    )}>
      {/* Phase color bar */}
      <div className={cn("h-[2px] w-full", {
        "bg-green-500": phase === "live",
        "bg-primary": phase === "upcoming",
        "bg-muted-foreground/20": phase === "past",
        "bg-destructive/30": phase === "cancelled",
      })} />

      <div className="px-4 py-3.5 flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          meeting.call_type === "video" ? "bg-violet-50 dark:bg-violet-950/40" : "bg-blue-50 dark:bg-blue-950/40"
        )}>
          {meeting.call_type === "video"
            ? <Video size={18} className="text-violet-600 dark:text-violet-400" />
            : <Phone size={18} className="text-blue-600 dark:text-blue-400" />
          }
        </div>

        {/* Main info */}
        <button className="flex-1 min-w-0 text-left" onClick={onOpen}>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13.5px] font-semibold truncate group-hover:text-primary transition-colors">{meeting.title}</p>
            <span className={cn("shrink-0 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border", phaseConfig.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", phaseConfig.dot)} />
              {phaseConfig.label}
            </span>
          </div>
          {meeting.description && (
            <p className="text-[11.5px] text-muted-foreground/60 line-clamp-1 mb-1">{meeting.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground/70">
            {starts && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {format(starts, "h:mm a")}
                {phase === "upcoming" && (
                  <span className="text-primary font-medium">· {formatDistanceToNowStrict(starts, { addSuffix: true })}</span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} />{meeting.duration_minutes} min
            </span>
            {attendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users size={10} />{attendees.length}
              </span>
            )}
            {meeting.is_instant && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Zap size={10} />Instant
              </span>
            )}
          </div>
        </button>

        {/* Attendee avatars */}
        {attendees.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-1.5 shrink-0">
            {attendees.slice(0, 4).map((a) => (
              <Avatar key={a.id} className="h-6 w-6 border-2 border-card">
                <AvatarImage src={(a as { avatar_url?: string }).avatar_url ?? ""} />
                <AvatarFallback className="text-[9px] font-bold bg-muted">{initials(a.full_name)}</AvatarFallback>
              </Avatar>
            ))}
            {attendees.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                +{attendees.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {phase === "live" && (
            <Button size="sm" className="h-7 px-3 text-[11.5px] gap-1 bg-green-600 hover:bg-green-700 shadow-sm" onClick={onOpen}>
              <Radio size={11} />Join
            </Button>
          )}
          {phase === "upcoming" && (
            <Button size="sm" variant="outline" className="h-7 px-3 text-[11.5px] gap-1" onClick={onOpen}>
              <ArrowUpRight size={11} />Open
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <MoreHorizontal size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpen}>
                <ArrowUpRight className="mr-2 h-3.5 w-3.5" />Open meeting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="mr-2 h-3.5 w-3.5" />Copy link
              </DropdownMenuItem>
              {isHost && phase !== "past" && phase !== "cancelled" && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit meeting
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onCancel}
                    disabled={meeting.status !== "scheduled"}
                  >
                    <XCircle className="mr-2 h-3.5 w-3.5" />Cancel meeting
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
