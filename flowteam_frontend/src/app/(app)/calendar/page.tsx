"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  RotateCcw,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/store/team";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type AnyEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: any;
};

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeTeamId, fetchTeams } = useTeamStore();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [view, setView] = useState("dayGridMonth");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [rangeTitle, setRangeTitle] = useState<string>("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);

  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [meetingStatus, setMeetingStatus] = useState<string>("all");
  const [showTasks, setShowTasks] = useState(true);
  const [showMeetings, setShowMeetings] = useState(true);
  const [showExternalEvents, setShowExternalEvents] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => dateOnly(new Date()));

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

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
        ApiResponse<{ tasks: CalendarTask[]; meetings: Meeting[]; milestones: any[]; external_events?: any[] }>
      >(
        `/dashboard/calendar/?${params.toString()}`
      );
      return res.data.data;
    },
    enabled: !!activeTeamId && !!dateRange.start && !!dateRange.end,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: string }) => api.patch(`/projects/tasks/${id}/`, { due_date: dueDate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, startsAt }: { id: string; startsAt: string }) => api.patch(`/meetings/${id}/`, { starts_at: startsAt }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
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
    const items = Array.from(set.values());
    items.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return items;
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
        borderColor: t.project_color,
        textColor: "#1e293b",
        extendedProps: { ...t, kind: "task" },
      }));

    const meetings: AnyEvent[] = filteredMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      start: m.starts_at,
      end: m.ends_at,
      allDay: false,
      backgroundColor: "rgba(99, 102, 241, 0.14)",
      borderColor: "rgba(99, 102, 241, 0.6)",
      textColor: "#1e293b",
      extendedProps: { ...m, kind: "meeting" },
    }));

    const external: AnyEvent[] = (showExternalEvents ? (data?.external_events ?? []) : []).map((e: any) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: false,
      backgroundColor: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.55)",
      textColor: "#1e293b",
      editable: false,
      extendedProps: { ...e, kind: "external" },
    }));

    return [...tasks, ...meetings, ...external];
  }, [data?.external_events, filteredMeetings, filteredTasks, showExternalEvents]);

  const handleDatesSet = (arg: any) => {
    setRangeTitle(arg?.view?.title ?? "");
    setDateRange({ start: arg.startStr.split("T")[0], end: arg.endStr.split("T")[0] });
  };

  const handleEventDrop = (info: any) => {
    const kind = info.event.extendedProps?.kind;
    if (kind === "task") {
      updateTaskMutation.mutate({ id: info.event.id, dueDate: info.event.startStr });
      return;
    }
    if (kind === "meeting") {
      const next = info.event.start as Date | null;
      if (!next) return info.revert?.();
      updateMeetingMutation.mutate({ id: info.event.id, startsAt: next.toISOString() });
      return;
    }
    info.revert?.();
  };

  const dayMeetings = useMemo(() => filteredMeetings.filter((m) => (m.starts_at ?? "").slice(0, 10) === selectedDate), [filteredMeetings, selectedDate]);
  const dayTasks = useMemo(() => filteredTasks.filter((t) => (t.due_date ?? "").slice(0, 10) === selectedDate), [filteredTasks, selectedDate]);

  const switchView = (v: string) => {
    setView(v);
    calendarRef.current?.getApi().changeView(v);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 px-6 py-3 border-b border-border bg-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-primary h-5 w-5 shrink-0" />
          <h1 className="text-[15px] font-bold tracking-tight">Calendar</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Nav: prev / today / next / title */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calendarRef.current?.getApi().prev()}>
              <ChevronLeft size={15} />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-[12px]" onClick={() => calendarRef.current?.getApi().today()}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calendarRef.current?.getApi().next()}>
              <ChevronRight size={15} />
            </Button>
          </div>
          <span className="text-[13px] font-semibold text-foreground min-w-[120px]">{rangeTitle}</span>

          {/* View switcher */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {(["dayGridMonth", "timeGridWeek", "listMonth"] as const).map((v, i) => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-[12px]"
                onClick={() => switchView(v)}
              >
                {["Month", "Week", "List"][i]}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={() => setFiltersOpen(true)}>
            <Filter size={13} />
            Filters
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-[12px]" onClick={() => setCreateMeetingOpen(true)} disabled={!activeTeamId}>
            <Video size={13} />
            New meeting
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 p-4 overflow-hidden min-h-0">
        <div className="h-full grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="h-full overflow-hidden">
            <CardContent className="p-0 h-full">
              <FullCalendar
                ref={calendarRef as any}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView={view}
                headerToolbar={false}
                events={events}
                datesSet={handleDatesSet}
                editable={true}
                eventDrop={handleEventDrop}
                height="100%"
                eventContent={(eventInfo) => <CalendarEvent event={eventInfo.event} />}
                eventClick={(info) => {
                  const kind = info.event.extendedProps?.kind;
                  if (kind === "meeting") router.push(`/meetings/${info.event.id}`);
                  if (kind === "task") {
                    const props = info.event.extendedProps as any;
                    if (props?.project_id) router.push(`/projects/${props.project_id}?task=${info.event.id}`);
                    else router.push(`/projects?task=${info.event.id}`);
                  }
                }}
                dateClick={(info) => setSelectedDate(info.dateStr.slice(0, 10))}
              />
            </CardContent>
          </Card>

          <Card className="h-full overflow-hidden flex flex-col">
            <CardContent className="p-4 h-full flex flex-col min-h-0">
              {/* Agenda header */}
              <div className="shrink-0 flex items-center justify-between gap-2 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[13px] font-semibold">Agenda</p>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">{selectedDate}</p>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto min-h-0 mt-3 space-y-4 pr-0.5">
                {/* Meetings section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meetings</p>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{dayMeetings.length}</span>
                  </div>
                  {dayMeetings.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground/70 italic">No meetings on this day.</p>
                  ) : (
                    dayMeetings
                      .slice()
                      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                      .map((m) => (
                        <button
                          key={m.id}
                          className="w-full text-left rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors"
                          onClick={() => router.push(`/meetings/${m.id}`)}
                        >
                          <p className="text-[12px] font-semibold truncate">{m.title}</p>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(m.starts_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              {" · "}{m.duration_minutes}m
                            </p>
                            <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">{m.call_type}</Badge>
                          </div>
                        </button>
                      ))
                  )}
                </div>

                {/* Tasks section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasks due</p>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{dayTasks.length}</span>
                  </div>
                  {dayTasks.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground/70 italic">No tasks due on this day.</p>
                  ) : (
                    dayTasks.map((t) => (
                      <button
                        key={t.id}
                        className="w-full text-left rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors"
                        onClick={() => router.push(`/projects/${t.project_id}?task=${t.id}`)}
                      >
                        <p className="text-[12px] font-semibold truncate">{t.title}</p>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground truncate">{t.project_name}</p>
                          <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">{t.priority}</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Tip */}
                {!isLoading && (
                  <p className="text-[11px] text-muted-foreground/60 italic pt-1">
                    Tip: drag tasks or meetings on the calendar to reschedule.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateMeetingDialog
        open={createMeetingOpen}
        onOpenChange={setCreateMeetingOpen}
        teamId={activeTeamId ?? null}
        defaultMode="schedule"
        redirectToMeeting
      />

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Calendar filters</DialogTitle>
            <DialogDescription>Control what appears on your calendar and agenda.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="calendarSearch">Search</Label>
              <Input id="calendarSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks + meetings…" />
            </div>

            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Meeting status</Label>
              <Select value={meetingStatus} onValueChange={setMeetingStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
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
                <div className="text-sm text-muted-foreground">Only my assigned tasks + meetings</div>
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
                  <p className="text-xs text-muted-foreground">Google/Outlook events (connect in Settings → Integrations)</p>
                </div>
                <Switch checked={showExternalEvents} onCheckedChange={(v) => setShowExternalEvents(v === true)} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                setSearch("");
                setProjectId("all");
                setPriority("all");
                setMeetingStatus("all");
                setMineOnly(false);
                setShowTasks(true);
                setShowMeetings(true);
                setShowExternalEvents(false);
                toast.success("Filters reset");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarEvent({ event }: { event: any }) {
  const props = event.extendedProps;

  if (props?.kind === "meeting") {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
        <Video size={9} className="shrink-0 opacity-70" />
        <span className="text-[10px] font-semibold truncate leading-tight">{event.title}</span>
      </div>
    );
  }

  if (props?.kind === "external") {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
        <CalendarIcon size={9} className="shrink-0 opacity-70" />
        <span className="text-[10px] font-semibold truncate leading-tight">{event.title}</span>
      </div>
    );
  }

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-slate-400",
  };

  return (
    <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityColors[props.priority] ?? "bg-slate-400")} />
      <span className="text-[10px] font-semibold truncate leading-tight">{event.title}</span>
    </div>
  );
}
