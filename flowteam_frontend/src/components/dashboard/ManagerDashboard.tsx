"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, ActivityRow,
  MiniMetric, QuickActionLink, PriorityBar, getTimeOfDay,
  type DashboardTask, type PriorityKey,
} from "./shared";
import { Button } from "@/components/ui/button";
import {
  Briefcase, AlertCircle, TrendingUp, CheckSquare, Activity,
  BarChart3, RefreshCcw, FolderPlus, ListTodo, CalendarRange,
  Users, Layers, Plus, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"] as PriorityKey[];

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
  onRefresh: () => void;
  isFetching: boolean;
}

export function ManagerDashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const recentTasks = data.my_tasks.recent ?? [];
  const projectItems = data.projects.items ?? [];
  const overdue = data.my_tasks.overdue;
  const dueToday = data.my_tasks.due_today;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek = data.team_stats.tasks_created_this_week;

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

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const priorityEntries = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: data.my_tasks.by_priority?.[priority] ?? 0,
  }));

  const activeProjects = projectItems.filter((p) => p.status === "active" || p.progress_percent > 0).slice(0, 4);

  // Workload: group team members' tasks — only possible if API provides it; fall back to member count
  const teamMembers = (members ?? []).filter((m) => m.role === "member");

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-emerald-600" />
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Team delivery overview — projects and sprint health
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={isFetching}>
          <RefreshCcw size={13} className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My open tasks"
          value={data.my_tasks.total}
          icon={Briefcase}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          href="/dashboard/my-tasks"
        />
        <StatCard
          title="Overdue tasks"
          value={overdue}
          icon={AlertCircle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          danger={overdue > 0}
          href="/dashboard/my-tasks?due=overdue"
        />
        <StatCard
          title="Team members"
          value={teamMembers.length}
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          href="/settings/members"
        />
        <StatCard
          title="Completed this week"
          value={completedThisWeek}
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
              <EmptyNote>No high-priority tasks right now. You&apos;re all clear.</EmptyNote>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {focusTasks.map((task) => <FocusTaskCard key={task.id} task={task} />)}
              </div>
            )}
          </Section>

          {/* Active projects */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Active projects</h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {activeProjects.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-5 text-[13px] text-muted-foreground">No active projects.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* Team activity */}
          <Section title="Team activity" icon={<Activity size={14} className="text-muted-foreground" />}>
            <div className="divide-y divide-border">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.slice(0, 8).map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Section title="Quick actions" icon={<Plus size={14} className="text-muted-foreground" />}>
            <div className="grid gap-3 p-4">
              <QuickActionLink href="/projects" icon={<FolderPlus size={14} />} label="Create project" description="Start a new workstream" />
              <QuickActionLink href="/dashboard/my-tasks" icon={<ListTodo size={14} />} label="Task queue" description="Review assigned work" />
              <QuickActionLink href="/calendar" icon={<CalendarRange size={14} />} label="Plan schedule" description="See due dates" />
            </div>
          </Section>

          <Section title="Priority radar" icon={<BarChart3 size={14} className="text-muted-foreground" />}>
            <div className="space-y-3 p-4">
              {priorityEntries.map((item) => (
                <PriorityBar
                  key={item.priority}
                  label={item.priority}
                  value={item.count}
                  max={Math.max(...priorityEntries.map((e) => e.count), 1)}
                />
              ))}
            </div>
          </Section>

          <Section title="Sprint metrics" icon={<CheckSquare size={14} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-3 p-4">
              <MiniMetric label="Created" value={createdThisWeek} tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek} tone="success" />
              <MiniMetric label="Velocity" value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : "neutral"} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function FocusTaskCard({ task }: { task: DashboardTask }) {
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
