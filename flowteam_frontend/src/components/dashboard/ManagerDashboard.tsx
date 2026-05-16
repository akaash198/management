"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { MissedMessagesPulse } from "./MissedMessagesPulse";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, ActivityRow,
  MiniMetric, QuickActionLink, PriorityBar, VelocityGauge,
  getTimeOfDay, type DashboardTask, type PriorityKey,
} from "./shared";
import {
  Briefcase, AlertCircle, TrendingUp, CheckSquare, Activity,
  BarChart3, RefreshCcw, FolderPlus, ListTodo, CalendarRange,
  Users, Layers, Plus, Sparkles, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

const PRIORITY_ORDER = ["urgent","high","normal","low"] as PriorityKey[];

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

  const recentTasks       = data.my_tasks.recent ?? [];
  const projectItems      = data.projects.items ?? [];
  const overdue           = data.my_tasks.overdue;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek   = data.team_stats.tasks_created_this_week;
  const teamMembers       = (members ?? []).filter((m) => m.role === "member");

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const focusTasks = useMemo(
    () =>
      [...recentTasks]
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
    [recentTasks]
  );

  const priorityEntries = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: data.my_tasks.by_priority?.[priority] ?? 0,
  }));

  const activeProjects = useMemo(
    () => [...projectItems]
      .sort((a, b) => b.overdue_count - a.overdue_count || b.progress_percent - a.progress_percent)
      .slice(0, 4),
    [projectItems]
  );

  const atRiskProjects = projectItems.filter((p) => p.overdue_count >= 2);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">

      {/* ── Missed Messages Briefing ── */}
      <MissedMessagesPulse />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-primary/8">
              <Layers size={12} className="text-primary" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Team delivery overview
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 shrink-0" onClick={onRefresh} disabled={isFetching}>
          <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── At-risk alert ── */}
      {atRiskProjects.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-3.5">
          <AlertCircle size={15} className="shrink-0 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">
            {atRiskProjects.length} project{atRiskProjects.length > 1 ? "s" : ""} at risk —{" "}
            <span className="font-normal text-destructive/80">
              {atRiskProjects.map((p) => p.name).join(", ")}
            </span>
          </p>
          <Link href="/projects" className="ml-auto shrink-0 text-[12px] font-semibold text-destructive hover:underline">
            Review →
          </Link>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My open tasks"       value={data.my_tasks.total} icon={Briefcase}   iconColor="text-primary"     iconBg="bg-primary/10"                        href="/dashboard/my-tasks" />
        <StatCard title="Overdue tasks"       value={overdue}             icon={AlertCircle} iconColor="text-destructive"  iconBg="bg-destructive/10" danger={overdue > 0}  href="/dashboard/my-tasks?due=overdue" />
        <StatCard title="Team members"        value={teamMembers.length}  icon={Users}       iconColor="text-primary"     iconBg="bg-primary/10"                        href="/settings/members" />
        <StatCard title="Completed this week" value={completedThisWeek}   icon={TrendingUp}  iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* Smart focus */}
          <Section
            title="My priority tasks"
            icon={<Sparkles size={13} className="text-primary" />}
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

          {/* Active projects with health indicators */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                Project health <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">({projectItems.length} total)</span>
              </h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {activeProjects.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-5 text-[12.5px] text-muted-foreground">
                No active projects.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* Team member workload */}
          {teamMembers.length > 0 && (
            <Section
              title="Team workload"
              icon={<Users size={13} className="text-muted-foreground" />}
              action={<SectionLink href="/settings/members">Manage</SectionLink>}
            >
              <div className="divide-y divide-border/60">
                {teamMembers.slice(0, 5).map((m) => (
                  <MemberWorkloadRow key={m.user.id} member={m} />
                ))}
                {teamMembers.length > 5 && (
                  <div className="px-5 py-3">
                    <Link href="/settings/members" className="text-[12px] font-semibold text-primary/70 hover:text-primary flex items-center gap-1">
                      View {teamMembers.length - 5} more members <ArrowUpRight size={11} />
                    </Link>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Team activity */}
          <Section title="Team activity" icon={<Activity size={13} className="text-muted-foreground" />}>
            <div className="divide-y divide-border/60">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.slice(0, 8).map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          <Section title="Quick actions" icon={<Plus size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <QuickActionLink href="/projects"            icon={<FolderPlus size={13} />}   label="Create project"  description="New workstream" />
              <QuickActionLink href="/dashboard/my-tasks"  icon={<ListTodo size={13} />}     label="Task queue"      description="Review assigned work" />
              <QuickActionLink href="/calendar"            icon={<CalendarRange size={13} />} label="Calendar"        description="Schedule and deadlines" />
            </div>
          </Section>

          {/* Velocity gauge */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
              Delivery velocity
            </p>
            <div className="flex items-center justify-center py-2">
              <VelocityGauge pct={deliveryVelocity} label="completed vs created" />
            </div>
          </div>

          <Section title="Priority breakdown" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
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

          <Section title="Sprint metrics" icon={<CheckSquare size={13} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MiniMetric label="Created"   value={createdThisWeek}        tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek}      tone="success" />
              <MiniMetric label="Velocity"  value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue"   value={overdue}                tone={overdue > 0 ? "danger" : "neutral"} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function FocusTaskCard({ task }: { task: DashboardTask }) {
  const priorityClasses: Record<string, string> = {
    urgent: "border-red-200 text-red-600 dark:border-red-800 dark:text-red-400",
    high:   "border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400",
    normal: "border-primary/25 text-primary",
    low:    "border-border text-muted-foreground",
  };
  return (
    <Link
      href={`/projects/${task.project}`}
      className="group rounded-xl border border-border bg-background p-4 transition-all duration-150 hover:border-primary/20 hover:shadow-sm"
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

function MemberWorkloadRow({ member }: { member: TeamMember }) {
  const initials = member.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/20">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={member.user.avatar_url || ""} />
        <AvatarFallback className="bg-muted text-[9px] font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-foreground">{member.user.full_name}</p>
      </div>
      <Link
        href={`/messages?user=${member.user.id}`}
        className="shrink-0 rounded-lg border border-border px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground hover:border-primary/20 hover:text-primary transition-colors"
      >
        Message
      </Link>
    </div>
  );
}
