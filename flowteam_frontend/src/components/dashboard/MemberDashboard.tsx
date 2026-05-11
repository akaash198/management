"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, TaskRow,
  getTimeOfDay, type DashboardTask, type PriorityKey,
} from "./shared";
import {
  Briefcase, AlertCircle, Clock, TrendingUp, RefreshCcw, Sparkles,
  ListTodo, CalendarRange, Search, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
  onRefresh: () => void;
  isFetching: boolean;
}

export function MemberDashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);

  const recentTasks  = data.my_tasks.recent ?? [];
  const projectItems = data.projects.items ?? [];
  const overdue      = data.my_tasks.overdue;
  const dueToday     = data.my_tasks.due_today;

  const search = deferredSearch.trim().toLowerCase();
  const filteredTasks = useMemo(
    () => recentTasks.filter(
      (t) => !search || t.title.toLowerCase().includes(search) || (t.project_name ?? "").toLowerCase().includes(search)
    ),
    [recentTasks, search]
  );

  const focusTasks = useMemo(
    () =>
      [...recentTasks]
        .sort((a, b) => {
          if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        })
        .slice(0, 4),
    [recentTasks]
  );

  const reportingTo = useMemo(() => {
    if (!members || !user) return null;
    return members.find((m) => m.role === "manager") ?? members.find((m) => m.role === "ceo") ?? null;
  }, [members, user]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-foreground">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Here&apos;s your personal task board for today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh} disabled={isFetching}>
            <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Link
            href="/dashboard/my-tasks"
            className="flex items-center gap-1 text-[12px] font-semibold text-primary/70 hover:text-primary transition-colors"
          >
            My tasks <ArrowUpRight size={11} className="opacity-60" />
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open tasks"          value={data.my_tasks.total}                       icon={Briefcase}   iconColor="text-primary"     iconBg="bg-primary/8"                        href="/dashboard/my-tasks" />
        <StatCard title="Overdue"             value={overdue}                                   icon={AlertCircle} iconColor="text-destructive"  iconBg="bg-destructive/8" danger={overdue > 0} href="/dashboard/my-tasks?due=overdue" />
        <StatCard title="Due today"           value={dueToday}                                  icon={Clock}       iconColor="text-amber-500"    iconBg="bg-amber-50 dark:bg-amber-950/40"    href="/dashboard/my-tasks?due=today" />
        <StatCard title="Completed this week" value={data.team_stats.tasks_completed_this_week} icon={TrendingUp}  iconColor="text-primary"      iconBg="bg-primary/8" />
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
              <EmptyNote>No urgent tasks. You&apos;re all clear!</EmptyNote>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {focusTasks.map((task) => <FocusCard key={task.id} task={task} />)}
              </div>
            )}
          </Section>

          {/* Recent tasks with search */}
          <Section
            title="My recent tasks"
            icon={<ListTodo size={13} className="text-muted-foreground" />}
            action={<SectionLink href="/dashboard/my-tasks">View all</SectionLink>}
          >
            <div className="border-b border-border/60 px-4 py-2.5">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search tasks…"
                  className="pl-7 h-7 text-[12px] bg-muted/30 border-0 focus-visible:ring-0 focus-visible:border-0"
                />
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {filteredTasks.length === 0 ? (
                <EmptyNote>{search ? "No tasks match your search." : "No recent tasks."}</EmptyNote>
              ) : (
                filteredTasks.map((task) => <TaskRow key={task.id} task={task} />)
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

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Quick actions */}
          <Section title="Quick actions" icon={<CalendarRange size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <Link
                href="/dashboard/my-tasks"
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 transition-all duration-150 hover:border-primary/20 hover:bg-primary/3 group"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                  <ListTodo size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">Open task queue</div>
                  <div className="text-[11px] text-muted-foreground/70">Review assigned work</div>
                </div>
                <ArrowUpRight size={12} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </Link>
              <Link
                href="/calendar"
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 transition-all duration-150 hover:border-primary/20 hover:bg-primary/3 group"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                  <CalendarRange size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">Plan schedule</div>
                  <div className="text-[11px] text-muted-foreground/70">Due dates and deadlines</div>
                </div>
                <ArrowUpRight size={12} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </Link>
            </div>
          </Section>

          {/* Reporting to */}
          {reportingTo && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                Reporting to
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={reportingTo.user.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/8 text-[10px] font-semibold text-primary">
                    {reportingTo.user.full_name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.01em]">{reportingTo.user.full_name}</p>
                  <p className="text-[11px] text-muted-foreground/60 capitalize">{reportingTo.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FocusCard({ task }: { task: DashboardTask }) {
  const priorityClasses: Record<string, string> = {
    urgent: "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400",
    high:   "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400",
    normal: "border-primary/20 bg-primary/8 text-primary",
    low:    "border-border bg-muted/60 text-muted-foreground",
  };
  return (
    <Link
      href={`/projects/${task.project}`}
      className="group rounded-xl border border-border bg-background p-4 transition-all duration-150 hover:border-primary/20 hover:shadow-2xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground group-hover:text-primary transition-colors">
            {task.title}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/65">{task.project_name} · {task.column_name}</p>
        </div>
        <span className={cn(
          "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
          priorityClasses[task.priority] ?? priorityClasses.normal
        )}>
          {task.priority}
        </span>
      </div>
      <div className="mt-3.5 flex items-center justify-between text-[11px]">
        <span className={cn("font-medium", task.is_overdue ? "text-destructive" : "text-muted-foreground/60")}>
          {task.due_date
            ? (task.is_overdue ? `Overdue · ${task.due_date}` : `Due ${task.due_date}`)
            : "No due date"}
        </span>
        <span className="text-primary/70 group-hover:text-primary transition-colors font-medium">Open →</span>
      </div>
    </Link>
  );
}
