"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { CalendarApi } from "@fullcalendar/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// FullCalendar bundles ~500KB across 6 packages — load only in the browser, only for this route
const CalendarWidget = dynamic(() => import("./CalendarWidget"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex flex-col gap-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
      ))}
    </div>
  ),
});
import api from "@/lib/api";
import type { CalendarTask } from "@/types/dashboard";
import type { Meeting } from "@/types/meetings";
import type { ApiResponse } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  ListChecks,
  RotateCcw,
  Download,
  Search,
  Video,
  X,
  Zap,
} from "lucide-react";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/store/team";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { toast } from "sonner";
import { format, isToday, isTomorrow, addDays, isWithinInterval, startOfDay, endOfDay, isBefore } from "date-fns";

type AnyEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: Record<string, unknown>;
};

type EventDetailType = {
  kind: "task" | "meeting" | "external";
  id: string;
  title: string;
  start: string;
  end?: string;
  priority?: string;
  project_name?: string;
  project_id?: string;
  column_name?: string;
  is_overdue?: boolean;
  is_done?: boolean;
  assignee?: { full_name: string } | null;
  call_type?: string;
  status?: string;
  duration_minutes?: number;
};

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE MMM d");
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-destructive",
  high: "text-warning",
  normal: "text-info",
  low: "text-muted-foreground",
};
const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-warning",
  normal: "bg-info",
  low: "bg-muted-foreground/40",
};

export default function CalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeTeamId, fetchTeams } = useTeamStore();
  const calendarRef = useRef<{ getApi(): CalendarApi } | null>(null);

  const [view, setView] = useState("dayGridMonth");
  // Pre-seed with the current month so the API fires immediately,
  // in parallel with FullCalendar loading — not after it mounts.
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0 + 14); // include next-month overflow
    return {
      start: dateOnly(start),
      end:   dateOnly(end),
    };
  });
  const [rangeTitle, setRangeTitle] = useState<string>("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);

  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [projectId, setProjectId] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [meetingStatus, setMeetingStatus] = useState<string>("all");
  const [showTasks, setShowTasks] = useState(true);
  const [showMeetings, setShowMeetings] = useState(true);
  const [showExternalEvents, setShowExternalEvents] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => dateOnly(new Date()));
  const [eventDetail, setEventDetail] = useState<EventDetailType | null>(null);

  const [isExportingCalendar, setIsExportingCalendar] = useState(false);

  const handleExportCalendar = async () => {
    if (!activeTeamId) return;
    setIsExportingCalendar(true);
    try {
      const params = new URLSearchParams({
        team_id: activeTeamId,
      });
      if (projectId && projectId !== "all") {
        params.append("project_id", projectId);
      }
      const res = await api.get(`/projects/calendar/export/?${params.toString()}`, {
        responseType: "blob",
      });
      saveAs(res.data, "calendar_tasks.ics");
      toast.success("Calendar exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export calendar");
    } finally {
      setIsExportingCalendar(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", activeTeamId, dateRange, mineOnly, showExternalEvents],
    queryFn: async () => {
      const params = new URLSearchParams({
        team_id: activeTeamId ?? "",
        start: dateRange.start,
        end: dateRange.end,
        mine: mineOnly ? "true" : "false",
        external: showExternalEvents ? "true" : "false",
      });
      const res = await api.get<
        ApiResponse<{ tasks: CalendarTask[]; meetings: Meeting[]; milestones: unknown[]; external_events?: unknown[] }>
      >(`/dashboard/calendar/?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!activeTeamId && !!dateRange.start && !!dateRange.end,
    staleTime: 60_000,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: string }) =>
      api.patch(`/projects/tasks/${id}/`, { due_date: dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Task rescheduled");
    },
    onError: () => toast.error("Failed to reschedule task"),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, startsAt }: { id: string; startsAt: string }) =>
      api.patch(`/meetings/${id}/`, { starts_at: startsAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Meeting rescheduled");
    },
    onError: () => toast.error("Failed to reschedule meeting"),
  });

  const projects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const t of data?.tasks ?? []) {
      if (t.project_id && t.project_name) map.set(t.project_id, { id: t.project_id, name: t.project_name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.tasks]);

  const priorities = useMemo(() => {
    const set = new Set<string>();
    for (const t of data?.tasks ?? []) set.add(t.priority);
    const order = ["urgent", "high", "normal", "low"];
    return Array.from(set.values()).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [data?.tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.tasks ?? []).filter((t) => {
      if (!showTasks) return false;
      if (projectId !== "all" && t.project_id !== projectId) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (q) {
        const hay = `${t.title} ${t.project_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data?.tasks, priority, projectId, search, showTasks]);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.meetings ?? []).filter((m) => {
      if (!showMeetings) return false;
      if (meetingStatus !== "all" && m.status !== meetingStatus) return false;
      if (q) {
        const hay = `${m.title ?? ""} ${m.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data?.meetings, meetingStatus, search, showMeetings]);

  const events = useMemo<AnyEvent[]>(() => {
    const tasks: AnyEvent[] = filteredTasks
      .filter((t) => !!t.due_date)
      .map((t) => ({
        id: t.id,
        title: t.title,
        start: t.due_date!,
        allDay: true,
        backgroundColor: `${t.project_color}33`,
        borderColor: t.is_done ? "transparent" : t.project_color,
        textColor: "var(--color-foreground)",
        extendedProps: { ...t, kind: "task" },
      }));

    const meetings: AnyEvent[] = filteredMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      start: m.starts_at,
      end: m.ends_at,
      allDay: false,
      backgroundColor: "rgba(124, 255, 203, 0.14)",
      borderColor: "rgba(124, 255, 203, 0.55)",
      textColor: "var(--color-foreground)",
      extendedProps: { ...m, kind: "meeting" },
    }));

    const external: AnyEvent[] = (showExternalEvents ? ((data?.external_events as unknown[] ?? [])) : []).map((e) => {
      const ev = e as Record<string, unknown>;
      return {
        id: ev.id as string,
        title: ev.title as string,
        start: ev.start as string,
        end: ev.end as string | undefined,
        allDay: false,
        backgroundColor: "rgba(124, 255, 203, 0.08)",
        borderColor: "rgba(124, 255, 203, 0.35)",
        textColor: "var(--color-foreground)",
        editable: false,
        extendedProps: { ...ev, kind: "external" },
      };
    });

    return [...tasks, ...meetings, ...external];
  }, [data?.external_events, filteredMeetings, filteredTasks, showExternalEvents]);

  // Stats
  const overdueTasks = useMemo(() => filteredTasks.filter((t) => t.is_overdue && !t.is_done), [filteredTasks]);
  const todayMeetings = useMemo(() => {
    const today = dateOnly(new Date());
    return filteredMeetings.filter((m) => m.starts_at.slice(0, 10) === today);
  }, [filteredMeetings]);

  // Upcoming 7 days grouped by date
  const upcomingByDay = useMemo(() => {
    const now = new Date();
    const in7 = addDays(now, 7);
    const map = new Map<string, { tasks: CalendarTask[]; meetings: Meeting[] }>();
    for (let i = 0; i <= 7; i++) {
      const d = dateOnly(addDays(now, i));
      map.set(d, { tasks: [], meetings: [] });
    }
    for (const t of filteredTasks) {
      if (!t.due_date) continue;
      const d = new Date(t.due_date + "T00:00:00");
      if (isWithinInterval(d, { start: startOfDay(now), end: endOfDay(in7) })) {
        const key = dateOnly(d);
        map.get(key)?.tasks.push(t);
      }
    }
    for (const m of filteredMeetings) {
      const d = new Date(m.starts_at);
      if (isWithinInterval(d, { start: startOfDay(now), end: endOfDay(in7) })) {
        const key = dateOnly(d);
        map.get(key)?.meetings.push(m);
      }
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.tasks.length > 0 || v.meetings.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTasks, filteredMeetings]);

  const dayMeetings = useMemo(
    () =>
      filteredMeetings
        .filter((m) => m.starts_at.slice(0, 10) === selectedDate)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [filteredMeetings, selectedDate]
  );
  const dayTasks = useMemo(
    () => filteredTasks.filter((t) => t.due_date?.slice(0, 10) === selectedDate),
    [filteredTasks, selectedDate]
  );

  const handleDatesSet = (arg: { view: { title: string }; startStr: string; endStr: string }) => {
    setRangeTitle(arg?.view?.title ?? "");
    setDateRange({ start: arg.startStr.split("T")[0], end: arg.endStr.split("T")[0] });
  };

  const handleEventDrop = (info: { event: { id: string; extendedProps?: Record<string, unknown>; start: Date | null; startStr: string }; revert?: () => void }) => {
    const kind = info.event.extendedProps?.kind;
    if (kind === "task") {
      updateTaskMutation.mutate({ id: info.event.id, dueDate: info.event.startStr });
      return;
    }
    if (kind === "meeting") {
      const next = info.event.start;
      if (!next) return info.revert?.();
      updateMeetingMutation.mutate({ id: info.event.id, startsAt: next.toISOString() });
      return;
    }
    info.revert?.();
  };

  const switchView = (v: string) => {
    setView(v);
    calendarRef.current?.getApi().changeView(v);
  };

  const activeFilterCount = [
    search.trim(),
    projectId !== "all" ? projectId : "",
    priority !== "all" ? priority : "",
    meetingStatus !== "all" ? meetingStatus : "",
    mineOnly ? "mine" : "",
    !showTasks ? "notasks" : "",
    !showMeetings ? "nomeetings" : "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchInput(""); setSearch("");
    setProjectId("all"); setPriority("all"); setMeetingStatus("all");
    setMineOnly(false); setShowTasks(true); setShowMeetings(true); setShowExternalEvents(false);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 px-6 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shrink-0">
              <CalendarIcon size={17} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight text-foreground leading-none">Calendar</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isLoading ? "Loading…" : `${filteredTasks.length} tasks · ${filteredMeetings.length} meetings`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Stats chips */}
            {overdueTasks.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 h-7 rounded-full border border-destructive/30 bg-destructive/10 px-3 text-[11px] font-semibold text-destructive">
                <AlertTriangle size={11} />
                {overdueTasks.length} overdue
              </div>
            )}
            {todayMeetings.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 h-7 rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold text-primary">
                <Video size={11} />
                {todayMeetings.length} today
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calendarRef.current?.getApi().prev()}>
                <ChevronLeft size={15} />
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 text-[12px]" onClick={() => { calendarRef.current?.getApi().today(); setSelectedDate(dateOnly(new Date())); }}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calendarRef.current?.getApi().next()}>
                <ChevronRight size={15} />
              </Button>
            </div>
            <span className="text-[13px] font-semibold text-foreground min-w-[120px] hidden md:block">{rangeTitle}</span>

            {/* View switcher */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              {(["dayGridMonth", "timeGridWeek", "timeGridDay", "listMonth"] as const).map((v, i) => (
                <Button
                  key={v}
                  variant={view === v ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => switchView(v)}
                >
                  {["Month", "Week", "Day", "List"][i]}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative hidden lg:block">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 w-[160px] text-[12px] bg-card"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(""); setSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 gap-1.5 text-[12px]", activeFilterCount > 0 && "border-primary/40 bg-primary/10 text-primary")}
              onClick={() => setFiltersOpen(true)}
            >
              <Filter size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[12px]"
              onClick={handleExportCalendar}
              disabled={!activeTeamId || isExportingCalendar}
            >
              <Download size={13} />
              {isExportingCalendar ? "Exporting..." : "Export Calendar"}
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-[12px]" onClick={() => setCreateMeetingOpen(true)} disabled={!activeTeamId}>
              <Video size={13} />
              New meeting
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {search.trim() && (
              <FilterChip label={`"${search.trim()}"`} onRemove={() => { setSearchInput(""); setSearch(""); }} />
            )}
            {projectId !== "all" && (
              <FilterChip label={projects.find((p) => p.id === projectId)?.name ?? "Project"} onRemove={() => setProjectId("all")} />
            )}
            {priority !== "all" && (
              <FilterChip label={priority.charAt(0).toUpperCase() + priority.slice(1)} onRemove={() => setPriority("all")} />
            )}
            {meetingStatus !== "all" && (
              <FilterChip label={meetingStatus.charAt(0).toUpperCase() + meetingStatus.slice(1)} onRemove={() => setMeetingStatus("all")} />
            )}
            {mineOnly && <FilterChip label="Mine only" onRemove={() => setMineOnly(false)} />}
            {!showTasks && <FilterChip label="Tasks hidden" onRemove={() => setShowTasks(true)} />}
            {!showMeetings && <FilterChip label="Meetings hidden" onRemove={() => setShowMeetings(true)} />}
            <button onClick={resetFilters} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-1">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 p-4 overflow-hidden min-h-0">
        <div className="h-full grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* Calendar */}
          <Card className="h-full overflow-hidden">
            <CardContent className="p-0 h-full relative">
              {isLoading && (
                <div className="absolute top-0 left-0 right-0 z-10 h-0.5 overflow-hidden rounded-t-xl">
                  <div className="h-full bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ width: "40%", animation: "progress-bar 1.2s ease-in-out infinite" }} />
                </div>
              )}
              <CalendarWidget
                calendarRef={calendarRef}
                view={view}
                events={events}
                onDatesSet={handleDatesSet}
                onEventDrop={handleEventDrop}
                onEventClick={(info) => {
                  const props = info.event.extendedProps as Record<string, unknown>;
                  const kind = props?.kind as string;
                  setEventDetail({
                    kind: kind as "task" | "meeting" | "external",
                    id: info.event.id,
                    title: info.event.title,
                    start: info.event.startStr,
                    end: info.event.endStr || undefined,
                    priority: props?.priority as string | undefined,
                    project_name: props?.project_name as string | undefined,
                    project_id: props?.project_id as string | undefined,
                    column_name: props?.column_name as string | undefined,
                    is_overdue: props?.is_overdue as boolean | undefined,
                    is_done: props?.is_done as boolean | undefined,
                    assignee: props?.assignee as { full_name: string } | null | undefined,
                    call_type: props?.call_type as string | undefined,
                    status: props?.status as string | undefined,
                    duration_minutes: props?.duration_minutes as number | undefined,
                  });
                }}
                onDateClick={(info) => setSelectedDate(info.dateStr.slice(0, 10))}
                eventContent={(eventInfo) => <CalendarEventChip event={eventInfo.event} />}
              />
            </CardContent>
          </Card>

          {/* Right panel */}
          <div className="h-full flex flex-col gap-3 min-h-0 overflow-y-auto">
            {/* Selected day agenda */}
            <Card className="shrink-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border mb-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-[13px] font-semibold">
                      {dayLabel(selectedDate)}
                    </p>
                  </div>
                  {(dayMeetings.length > 0 || dayTasks.length > 0) && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {dayMeetings.length + dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Meetings */}
                  {dayMeetings.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meetings</p>
                      {dayMeetings.map((m) => (
                        <AgendaMeetingRow key={m.id} meeting={m} onOpen={() => router.push(`/meetings/${m.id}`)} />
                      ))}
                    </div>
                  )}

                  {/* Tasks */}
                  {dayTasks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasks due</p>
                      {dayTasks.map((t) => (
                        <AgendaTaskRow key={t.id} task={t} onOpen={() => router.push(`/projects/${t.project_id}?task=${t.id}`)} />
                      ))}
                    </div>
                  )}

                  {dayMeetings.length === 0 && dayTasks.length === 0 && (
                    <p className="text-[12px] text-muted-foreground/60 italic text-center py-2">
                      Nothing scheduled for this day.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming 7 days */}
            {upcomingByDay.length > 0 && (
              <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <CardContent className="p-4 flex flex-col min-h-0 h-full">
                  <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 shrink-0">
                    <ArrowRight className="h-4 w-4 text-accent shrink-0" />
                    <p className="text-[13px] font-semibold">Next 7 days</p>
                  </div>
                  <div className="overflow-y-auto flex-1 space-y-4 pr-0.5">
                    {upcomingByDay.map(([dateStr, { tasks, meetings }]) => (
                      <div key={dateStr}>
                        <button
                          onClick={() => { setSelectedDate(dateStr); calendarRef.current?.getApi().gotoDate(dateStr); }}
                          className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 hover:text-foreground transition-colors w-full text-left flex items-center gap-1.5"
                        >
                          {dayLabel(dateStr)}
                          <span className="text-[10px] font-normal opacity-60">({tasks.length + meetings.length})</span>
                        </button>
                        <div className="space-y-1">
                          {meetings.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).map((m) => (
                            <UpcomingMeetingRow key={m.id} meeting={m} onClick={() => router.push(`/meetings/${m.id}`)} />
                          ))}
                          {tasks.map((t) => (
                            <UpcomingTaskRow key={t.id} task={t} onClick={() => router.push(`/projects/${t.project_id}?task=${t.id}`)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overdue callout */}
            {overdueTasks.length > 0 && (
              <Card className="shrink-0 border-destructive/30 bg-destructive/5">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-destructive">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}</p>
                      <div className="mt-1 space-y-0.5">
                        {overdueTasks.slice(0, 3).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => router.push(`/projects/${t.project_id}?task=${t.id}`)}
                            className="block w-full text-left text-[11px] text-muted-foreground hover:text-foreground truncate transition-colors"
                          >
                            {t.title}
                          </button>
                        ))}
                        {overdueTasks.length > 3 && (
                          <p className="text-[11px] text-muted-foreground/60">+{overdueTasks.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <p className="text-[11px] text-muted-foreground/50 italic text-center shrink-0 pb-1">
              Drag events to reschedule
            </p>
          </div>
        </div>
      </div>

      {/* ── Event detail dialog ── */}
      <Dialog open={!!eventDetail} onOpenChange={(open) => { if (!open) setEventDetail(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          {eventDetail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  {eventDetail.kind === "meeting" ? (
                    <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Video size={16} className="text-primary" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} className="text-accent" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogTitle className="text-[15px] leading-snug">{eventDetail.title}</DialogTitle>
                    <DialogDescription className="mt-0.5 text-[12px]">
                      {eventDetail.kind === "meeting" ? "Meeting" : eventDetail.project_name ?? "Task"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-2 py-1">
                <DetailRow icon={<Clock size={13} />} label="When">
                  {eventDetail.kind === "task"
                    ? `Due ${eventDetail.start}`
                    : `${formatTime(eventDetail.start)}${eventDetail.duration_minutes ? ` · ${eventDetail.duration_minutes}m` : ""}`}
                </DetailRow>
                {eventDetail.priority && (
                  <DetailRow icon={<Zap size={13} className={PRIORITY_COLOR[eventDetail.priority]} />} label="Priority">
                    <span className={cn("capitalize font-medium", PRIORITY_COLOR[eventDetail.priority])}>
                      {eventDetail.priority}
                    </span>
                  </DetailRow>
                )}
                {eventDetail.column_name && (
                  <DetailRow icon={<CheckCircle2 size={13} />} label="Status">
                    {eventDetail.column_name}
                    {eventDetail.is_done && <span className="ml-1.5 text-success font-semibold">· Done</span>}
                    {eventDetail.is_overdue && !eventDetail.is_done && <span className="ml-1.5 text-destructive font-semibold">· Overdue</span>}
                  </DetailRow>
                )}
                {eventDetail.assignee && (
                  <DetailRow icon={<div className="h-3 w-3 rounded-full bg-primary" />} label="Assignee">
                    {eventDetail.assignee.full_name}
                  </DetailRow>
                )}
                {eventDetail.status && (
                  <DetailRow icon={<CalendarIcon size={13} />} label="Status">
                    <span className="capitalize">{eventDetail.status}</span>
                    {eventDetail.call_type && <span className="ml-1.5 text-muted-foreground capitalize">· {eventDetail.call_type}</span>}
                  </DetailRow>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setEventDetail(null)}>Close</Button>
                <Button size="sm" onClick={() => {
                  setEventDetail(null);
                  if (eventDetail.kind === "meeting") router.push(`/meetings/${eventDetail.id}`);
                  else if (eventDetail.project_id) router.push(`/projects/${eventDetail.project_id}?task=${eventDetail.id}`);
                }}>
                  Open {eventDetail.kind === "meeting" ? "meeting" : "task"}
                  <ArrowRight size={13} className="ml-1.5" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Filters dialog ── */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Calendar filters</DialogTitle>
            <DialogDescription>Control what appears on your calendar.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search tasks + meetings…"
                className="pl-8"
              />
            </div>

            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue placeholder="All priorities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Meeting status</Label>
              <Select value={meetingStatus} onValueChange={setMeetingStatus}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Mine only</Label>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-4 py-3">
                <p className="text-sm text-muted-foreground">My assigned tasks + meetings</p>
                <Switch checked={mineOnly} onCheckedChange={(v) => setMineOnly(v === true)} />
              </div>
            </div>

            <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Show tasks</p>
                  <p className="text-xs text-muted-foreground">Task due dates on the calendar</p>
                </div>
                <Switch checked={showTasks} onCheckedChange={(v) => setShowTasks(v === true)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Show meetings</p>
                  <p className="text-xs text-muted-foreground">Scheduled meetings and calls</p>
                </div>
                <Switch checked={showMeetings} onCheckedChange={(v) => setShowMeetings(v === true)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Show external events</p>
                  <p className="text-xs text-muted-foreground">Google / Outlook events (connect in Settings → Integrations)</p>
                </div>
                <Switch checked={showExternalEvents} onCheckedChange={(v) => setShowExternalEvents(v === true)} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button type="button" variant="outline" className="gap-2" onClick={() => { resetFilters(); toast.success("Filters reset"); }}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateMeetingDialog
        open={createMeetingOpen}
        onOpenChange={setCreateMeetingOpen}
        teamId={activeTeamId ?? null}
        defaultMode="schedule"
        redirectToMeeting
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 h-6 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
    >
      {label}
      <X size={10} />
    </button>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 w-24 shrink-0 text-muted-foreground text-[12px]">
        {icon}
        {label}
      </div>
      <div className="text-[13px] text-foreground">{children}</div>
    </div>
  );
}

function AgendaMeetingRow({ meeting, onOpen }: { meeting: Meeting; onOpen: () => void }) {
  return (
    <button
      className="w-full text-left rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors group"
      onClick={onOpen}
    >
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        <p className="text-[12px] font-semibold truncate flex-1">{meeting.title}</p>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {formatTime(meeting.starts_at)} · {meeting.duration_minutes}m
        </p>
        <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">{meeting.call_type}</Badge>
      </div>
    </button>
  );
}

function AgendaTaskRow({ task, onOpen }: { task: CalendarTask; onOpen: () => void }) {
  return (
    <button
      className="w-full text-left rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors group"
      onClick={onOpen}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "bg-muted-foreground/40")}
        />
        <p className={cn("text-[12px] font-semibold truncate flex-1", task.is_done && "line-through text-muted-foreground")}>{task.title}</p>
        {task.is_overdue && !task.is_done && <AlertTriangle size={11} className="text-destructive shrink-0" />}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground truncate">{task.project_name}</p>
        <span className={cn("text-[10px] font-semibold capitalize", PRIORITY_COLOR[task.priority])}>{task.priority}</span>
      </div>
    </button>
  );
}

function UpcomingMeetingRow({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
    >
      <Video size={11} className="text-primary shrink-0" />
      <span className="text-[12px] truncate flex-1 text-foreground">{meeting.title}</span>
      <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(meeting.starts_at)}</span>
    </button>
  );
}

function UpcomingTaskRow({ task, onClick }: { task: CalendarTask; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
    >
      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "bg-muted-foreground/40")} />
      <span className={cn("text-[12px] truncate flex-1", task.is_done ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</span>
      {task.is_overdue && !task.is_done && <AlertTriangle size={10} className="text-destructive shrink-0" />}
    </button>
  );
}

function CalendarEventChip({ event }: { event: { title: string; extendedProps?: Record<string, unknown> } }) {
  const props = event.extendedProps;
  const kind = props?.kind;

  if (kind === "meeting") {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
        <Video size={9} className="shrink-0 opacity-70" />
        <span className="text-[10px] font-semibold truncate leading-tight">{event.title}</span>
      </div>
    );
  }

  if (kind === "external") {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
        <CalendarIcon size={9} className="shrink-0 opacity-70" />
        <span className="text-[10px] font-semibold truncate leading-tight">{event.title}</span>
      </div>
    );
  }

  const p = (props?.priority as string) ?? "low";
  const isDone = props?.is_done as boolean;
  const isOverdue = props?.is_overdue as boolean;

  return (
    <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[p])} />
      <span className={cn("text-[10px] font-semibold truncate leading-tight", isDone && "line-through opacity-50")}>{event.title}</span>
      {isOverdue && !isDone && <AlertTriangle size={8} className="text-destructive shrink-0 ml-auto" />}
    </div>
  );
}
