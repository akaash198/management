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
  PriorityPill, getTimeOfDay, type DashboardTask, type PriorityKey,
} from "./shared";
import {
  Briefcase, AlertCircle, Clock, TrendingUp, RefreshCcw, Sparkles,
  ListTodo, CalendarRange, Search,
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

  const recentTasks = data.my_tasks.recent ?? [];
  const projectItems = data.projects.items ?? [];
  const overdue = data.my_tasks.overdue;
  const dueToday = data.my_tasks.due_today;

  const search = deferredSearch.trim().toLowerCase();
  const filteredTasks = useMemo(
    () =>
      recentTasks.filter(
        (t) =>
          !search ||
          t.title.toLowerCase().includes(search) ||
          (t.project_name ?? "").toLowerCase().includes(search)
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
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Here&apos;s your personal task board for today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={isFetching}>
            <RefreshCcw size={13} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/dashboard/my-tasks" className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
            My tasks <ListTodo size={12} className="ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          href="/dashboard/my-tasks?due=today"
        />
        <StatCard
          title="Completed this week"
          value={data.team_stats.tasks_completed_this_week}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* Smart focus */}
          <Section
            title="Smart focus"
            icon={<Sparkles size={14} className="text-primary" />}
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
            icon={<ListTodo size={14} className="text-muted-foreground" />}
            action={<SectionLink href="/dashboard/my-tasks">View all</SectionLink>}
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search tasks..."
                  className="pl-8 h-8 text-[12px]"
                />
              </div>
            </div>
            <div className="divide-y divide-border">
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
                <h2 className="text-[14px] font-semibold text-foreground">Active projects</h2>
                <SectionLink href="/projects">View all</SectionLink>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {projectItems.slice(0, 4).map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick actions */}
          <Section title="Quick actions" icon={<CalendarRange size={14} className="text-muted-foreground" />}>
            <div className="grid gap-3 p-4">
              <Link href="/dashboard/my-tasks" className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListTodo size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">Open task queue</div>
                  <div className="text-[11px] text-muted-foreground">Review assigned work</div>
                </div>
              </Link>
              <Link href="/calendar" className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarRange size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">Plan schedule</div>
                  <div className="text-[11px] text-muted-foreground">See due dates and deadlines</div>
                </div>
              </Link>
            </div>
          </Section>

          {/* Reporting to */}
          {reportingTo && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={reportingTo.user.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {reportingTo.user.full_name.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reporting to</p>
                <p className="truncate text-[13px] font-semibold">{reportingTo.user.full_name}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] font-semibold capitalize">
                {reportingTo.role}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FocusCard({ task }: { task: DashboardTask }) {
  const priorityClasses: Record<string, string> = {
    urgent: "border-red-200 bg-red-50 text-red-700",
    high: "border-amber-200 bg-amber-50 text-amber-700",
    normal: "border-primary/20 bg-primary/10 text-primary",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <Link
      href={`/projects/${task.project}`}
      className="rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{task.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{task.project_name} · {task.column_name}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", priorityClasses[task.priority] ?? priorityClasses.normal)}>
          {task.priority}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className={cn("font-medium", task.is_overdue ? "text-destructive" : "text-muted-foreground")}>
          {task.due_date ? (task.is_overdue ? `Overdue · ${task.due_date}` : `Due ${task.due_date}`) : "No due date"}
        </span>
        <span className="text-primary">Open</span>
      </div>
    </Link>
  );
}
