"use client";

import { useDeferredValue, useMemo, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, TaskRow,
  TodayBanner, VelocityGauge, QuickActionLink,
  getTimeOfDay, type DashboardTask, type PriorityKey,
} from "./shared";
import {
  Briefcase, AlertCircle, Clock, TrendingUp, RefreshCcw, Sparkles,
  ListTodo, CalendarRange, Search, ArrowUpRight, CheckCircle2,
  Target, Flame, Star,
} from "lucide-react";
import { MissedMessagesPulse } from "./MissedMessagesPulse";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import api from "@/lib/api";

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
  onRefresh: () => void;
  isFetching: boolean;
}

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"] as PriorityKey[];

export function MemberDashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const [searchText, setSearchText] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const deferredSearch = useDeferredValue(searchText);

  const recentTasks  = data.my_tasks.recent ?? [];
  const projectItems = data.projects.items ?? [];
  const overdue      = data.my_tasks.overdue;
  const dueToday     = data.my_tasks.due_today;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;

  const completionRate = Math.min(100, Math.round(
    (completedThisWeek / Math.max(data.team_stats.tasks_created_this_week, 1)) * 100
  ));

  const search = deferredSearch.trim().toLowerCase();

  const filteredTasks = useMemo(() => {
    let tasks = recentTasks;
    if (taskFilter === "overdue") tasks = tasks.filter((t) => t.is_overdue);
    else if (taskFilter === "today") tasks = tasks.filter((t) => t.due_date === format(new Date(), "yyyy-MM-dd"));
    else if (taskFilter === "upcoming") tasks = tasks.filter((t) => t.due_date && !t.is_overdue);
    if (search) tasks = tasks.filter((t) => t.title.toLowerCase().includes(search) || (t.project_name ?? "").toLowerCase().includes(search));
    return tasks;
  }, [recentTasks, taskFilter, search]);

  const focusTasks = useMemo(
    () =>
      [...recentTasks]
        .filter((t) => !completedIds.has(t.id))
        .sort((a, b) => {
          if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
          const pa = PRIORITY_ORDER.indexOf(a.priority as PriorityKey);
          const pb = PRIORITY_ORDER.indexOf(b.priority as PriorityKey);
          if (pa !== pb) return pa - pb;
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        })
        .slice(0, 4),
    [recentTasks, completedIds]
  );

  const reportingTo = useMemo(() => {
    if (!members || !user) return null;
    return members.find((m) => m.role === "manager") ?? members.find((m) => m.role === "ceo") ?? null;
  }, [members, user]);

  const handleComplete = useCallback(async (taskId: string) => {
    setCompletedIds((prev) => new Set([...prev, taskId]));
    try {
      await api.patch(`/tasks/${taskId}/`, { is_done: true });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      setCompletedIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  }, [queryClient]);

  const FILTER_TABS: { key: typeof taskFilter; label: string; count?: number }[] = [
    { key: "all",      label: "All",      count: recentTasks.length },
    { key: "overdue",  label: "Overdue",  count: overdue },
    { key: "today",    label: "Today",    count: dueToday },
    { key: "upcoming", label: "Upcoming" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">

      {/* ── Missed Messages Briefing ── */}
      <MissedMessagesPulse />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-primary/8">
              <Star size={12} className="text-primary" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Your personal work summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={onRefresh} disabled={isFetching}>
            <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Link
            href="/dashboard/my-tasks"
            className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 h-8 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            My tasks <ArrowUpRight size={11} className="opacity-60" />
          </Link>
        </div>
      </div>

      {/* ── Today alert ── */}
      <TodayBanner overdue={overdue} dueToday={dueToday} />

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open tasks"
          value={data.my_tasks.total}
          icon={Briefcase}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          href="/dashboard/my-tasks"
        />
        <StatCard
          title="Overdue"
          value={overdue}
          icon={AlertCircle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          danger={overdue > 0}
          href="/dashboard/my-tasks?due=overdue"
        />
        <StatCard
          title="Due today"
          value={dueToday}
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          href="/dashboard/my-tasks?due=today"
        />
        <StatCard
          title="Completed this week"
          value={completedThisWeek}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* Smart focus */}
          <Section
            title="Smart focus"
            icon={<Sparkles size={13} className="text-primary" />}
            action={<SectionLink href="/dashboard/my-tasks">Open planner</SectionLink>}
          >
            {focusTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle2 size={24} className="text-emerald-500" />
                <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">All caught up!</p>
                <p className="text-[12px] text-muted-foreground">No urgent tasks right now.</p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {focusTasks.map((task) => (
                  <FocusCard
                    key={task.id}
                    task={task}
                    completed={completedIds.has(task.id)}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Recent tasks with search + filter tabs */}
          <Section
            title="My tasks"
            icon={<ListTodo size={13} className="text-muted-foreground" />}
            action={<SectionLink href="/dashboard/my-tasks">View all</SectionLink>}
          >
            <div className="border-b border-border/60 px-4 py-2.5 space-y-2.5">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search tasks…"
                  className="pl-7 h-7 text-[12px] bg-muted/30 border-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex gap-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTaskFilter(tab.key)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      taskFilter === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        taskFilter === tab.key
                          ? "bg-white/20 text-white"
                          : tab.key === "overdue" ? "bg-destructive/10 text-destructive" : "bg-muted-foreground/10"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {filteredTasks.length === 0 ? (
                <EmptyNote>{search ? "No tasks match your search." : "No tasks in this category."}</EmptyNote>
              ) : (
                filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={{ ...task, is_done: completedIds.has(task.id) } as any}
                    onComplete={handleComplete}
                  />
                ))
              )}
            </div>
          </Section>

          {/* Active projects */}
          {projectItems.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">Active projects</h2>
                <SectionLink href="/projects">View all</SectionLink>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {projectItems.slice(0, 4).map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Weekly progress */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
              This week
            </p>
            <div className="flex items-center justify-between gap-3">
              <VelocityGauge pct={completionRate} label="Completion" />
              <div className="flex-1 space-y-2.5">
                <WeekStat icon={<Target size={11} />} label="Created" value={data.team_stats.tasks_created_this_week} />
                <WeekStat icon={<CheckCircle2 size={11} className="text-emerald-500" />} label="Completed" value={completedThisWeek} tone="success" />
                <WeekStat icon={<AlertCircle size={11} className="text-destructive" />} label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : "neutral"} />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <Section title="Quick actions" icon={<CalendarRange size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <QuickActionLink href="/dashboard/my-tasks"   icon={<ListTodo size={13} />}      label="Task queue"      description="Review assigned work" />
              <QuickActionLink href="/calendar"             icon={<CalendarRange size={13} />}  label="Calendar"        description="Due dates and meetings" />
              <QuickActionLink href="/projects"             icon={<Briefcase size={13} />}      label="Projects"        description="Browse active projects" />
            </div>
          </Section>

          {/* Reporting to */}
          {reportingTo && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                Reporting to
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={reportingTo.user.avatar_url || ""} />
                  <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                    {reportingTo.user.full_name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.01em]">{reportingTo.user.full_name}</p>
                  <p className="text-[11px] text-muted-foreground/60 capitalize">{reportingTo.role}</p>
                </div>
                <Link href="/messages" className="shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]">Message</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekStat({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: number;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div className="flex items-center justify-between">
      <div className={cn("flex items-center gap-1.5 text-[11.5px] text-muted-foreground")}>
        {icon} {label}
      </div>
      <span className={cn(
        "text-[12px] font-bold tabular-nums",
        tone === "success" ? "text-emerald-600 dark:text-emerald-400"
          : tone === "danger" && value > 0 ? "text-destructive"
          : "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}

function FocusCard({ task, completed, onComplete }: {
  task: DashboardTask; completed: boolean; onComplete: (id: string) => void;
}) {
  const priorityClasses: Record<string, string> = {
    urgent: "border-red-200 text-red-600 dark:border-red-800 dark:text-red-400",
    high:   "border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400",
    normal: "border-primary/25 text-primary",
    low:    "border-border text-muted-foreground",
  };
  return (
    <div className={cn(
      "group relative rounded-xl border border-border bg-background p-4 transition-all duration-150 hover:border-primary/20 hover:shadow-sm",
      completed && "opacity-50"
    )}>
      <button
        type="button"
        onClick={() => onComplete(task.id)}
        className="absolute right-3 top-3 text-muted-foreground/40 hover:text-primary transition-colors"
        title="Mark complete"
      >
        {completed ? <CheckCircle2 size={15} className="text-primary" /> : <CheckCircle2 size={15} />}
      </button>
      <Link href={`/projects/${task.project}`} className="block">
        <div className="flex items-start gap-2 pr-5">
          <div className="min-w-0 flex-1">
            <p className={cn(
              "truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground group-hover:text-primary transition-colors",
              completed && "line-through"
            )}>
              {task.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/65">{task.project_name} · {task.column_name}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={cn(
            "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
            priorityClasses[task.priority] ?? priorityClasses.normal
          )}>
            {task.priority}
          </span>
          <span className={cn("text-[11px] font-medium", task.is_overdue ? "text-destructive" : "text-muted-foreground/60")}>
            {task.due_date
              ? (task.is_overdue ? `Overdue · ${task.due_date}` : `Due ${task.due_date}`)
              : "No due date"}
          </span>
        </div>
      </Link>
    </div>
  );
}
