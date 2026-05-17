"use client";

import { useMemo, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { MissedMessagesPulse } from "./MissedMessagesPulse";
import { QuickTaskModal } from "./QuickTaskModal";
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
  Users, Layers, Plus, Sparkles, ArrowUpRight, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { InviteMemberModal } from "./InviteMemberModal";
import api from "@/lib/api";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const recentTasks       = data.my_tasks.recent ?? [];
  const projectItems      = data.projects.items ?? [];
  const overdue           = data.my_tasks.overdue;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek   = data.team_stats.tasks_created_this_week;
  const teamMembers       = (members ?? []).filter((m) => m.role === "member");

  const deliveryVelocity = Math.min(100, Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100));

  const focusTasks = useMemo(() =>
    [...recentTasks]
      .sort((a, b) => {
        if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
        const pa = PRIORITY_ORDER.indexOf(a.priority as PriorityKey);
        const pb = PRIORITY_ORDER.indexOf(b.priority as PriorityKey);
        if (pa !== pb) return pa - pb;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        return a.due_date ? -1 : b.due_date ? 1 : 0;
      })
      .slice(0, 4),
    [recentTasks]
  );

  const priorityEntries = PRIORITY_ORDER.map((p) => ({ priority: p, count: data.my_tasks.by_priority?.[p] ?? 0 }));

  const atRiskProjects = useMemo(() => projectItems.filter((p) => p.overdue_count >= 2), [projectItems]);
  const sortedProjects = useMemo(() =>
    [...projectItems].sort((a, b) => b.overdue_count - a.overdue_count || a.progress_percent - b.progress_percent).slice(0, 4),
    [projectItems]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <QuickTaskModal open={createTaskOpen} onOpenChange={setCreateTaskOpen} />
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />
      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} teamId={activeTeamId} onSuccess={onRefresh} />
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
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5 h-8 text-[12px]">
            <Users size={12} />Invite
          </Button>
          <Button size="sm" onClick={() => setCreateProjectOpen(true)} className="gap-1.5 h-8 text-[12px]">
            <Plus size={12} />New project
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh} disabled={isFetching}>
            <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── At-risk alert ── */}
      {atRiskProjects.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-3.5">
          <AlertCircle size={15} className="shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-destructive">
              {atRiskProjects.length} project{atRiskProjects.length > 1 ? "s" : ""} need attention
            </p>
            <p className="text-[11.5px] text-destructive/70 truncate">
              {atRiskProjects.map((p) => p.name).join(" · ")}
            </p>
          </div>
          <Link
            href={atRiskProjects.length === 1 ? `/projects/${atRiskProjects[0].id}` : "/projects?filter=overdue"}
            className="shrink-0 text-[12px] font-semibold text-destructive hover:underline whitespace-nowrap"
          >
            Review →
          </Link>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My open tasks"       value={data.my_tasks.total} icon={Briefcase}   iconColor="text-primary"     iconBg="bg-primary/10"                       href="/dashboard/my-tasks" />
        <StatCard title="Overdue tasks"       value={overdue}             icon={AlertCircle} iconColor="text-destructive"  iconBg="bg-destructive/10" danger={overdue > 0} href="/dashboard/my-tasks?due=overdue" />
        <StatCard title="Team members"        value={teamMembers.length}  icon={Users}       iconColor="text-primary"     iconBg="bg-primary/10"                       href="/settings/members" />
        <StatCard title="Completed this week" value={completedThisWeek}   icon={TrendingUp}  iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* My priority tasks */}
          <Section
            title="My priority tasks"
            icon={<Sparkles size={13} className="text-primary" />}
            action={<SectionLink href="/dashboard/my-tasks">Open planner</SectionLink>}
          >
            {focusTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-[13px] font-semibold text-foreground">All clear!</p>
                <p className="text-[12px] text-muted-foreground">No high-priority tasks right now.</p>
                <Button size="sm" variant="outline" onClick={() => setCreateTaskOpen(true)} className="mt-1 gap-1.5 text-[12px]">
                  <Plus size={11} />Create task
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {focusTasks.map((task) => <FocusTaskCard key={task.id} task={task} />)}
              </div>
            )}
          </Section>

          {/* Project health */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                Project health
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">{projectItems.length} active</span>
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCreateProjectOpen(true)} className="h-7 gap-1 text-[11.5px]">
                  <Plus size={11} />New
                </Button>
                <SectionLink href="/projects">View all</SectionLink>
              </div>
            </div>
            {sortedProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8">
                <p className="text-[12.5px] text-muted-foreground">No active projects yet.</p>
                <Button size="sm" onClick={() => setCreateProjectOpen(true)} className="gap-1.5 text-[12px]">
                  <Plus size={12} />Create first project
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* Team workload */}
          {(members ?? []).length > 0 && (
            <Section
              title="Team"
              icon={<Users size={13} className="text-muted-foreground" />}
              action={
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-0.5 text-[11.5px] font-semibold text-primary/70 hover:text-primary transition-colors">
                    Invite <Plus size={10} className="opacity-60" />
                  </button>
                </div>
              }
            >
              <div className="divide-y divide-border/60">
                {(members ?? []).slice(0, 6).map((m) => <MemberRow key={m.user.id} member={m} />)}
                {(members ?? []).length > 6 && (
                  <Link href="/settings/members" className="flex items-center gap-1 px-5 py-3 text-[12px] font-semibold text-primary/70 hover:text-primary transition-colors">
                    View {(members ?? []).length - 6} more <ArrowUpRight size={11} />
                  </Link>
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
          <Section title="Actions" icon={<Plus size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <button
                type="button"
                onClick={() => setCreateTaskOpen(true)}
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 hover:bg-primary/10 transition-colors group text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 text-primary"><ListTodo size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-primary">Create task</div><div className="text-[11px] text-muted-foreground/70">Add to task list</div></div>
              </button>
              <button
                type="button"
                onClick={() => setCreateProjectOpen(true)}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><FolderPlus size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-foreground">New project</div><div className="text-[11px] text-muted-foreground/70">Start a new workstream</div></div>
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><Users size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-foreground">Invite member</div><div className="text-[11px] text-muted-foreground/70">Grow the team</div></div>
              </button>
              <QuickActionLink href="/calendar" icon={<CalendarRange size={13} />} label="Calendar" description="Deadlines and schedule" />
            </div>
          </Section>

          {/* Velocity gauge */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Delivery velocity</p>
            <div className="flex items-center justify-center py-2">
              <VelocityGauge pct={deliveryVelocity} label="completed vs created" />
            </div>
          </div>

          <Section title="Priority breakdown" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
            <div className="space-y-3 p-4">
              {priorityEntries.map((item) => (
                <PriorityBar key={item.priority} label={item.priority} value={item.count} max={Math.max(...priorityEntries.map((e) => e.count), 1)} />
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
    <Link href={`/projects/${task.project}?task=${task.id}`} className="group rounded-xl border border-border bg-background p-4 transition-all duration-150 hover:border-primary/20 hover:shadow-sm block">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold tracking-[-0.01em] group-hover:text-primary transition-colors">{task.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/65">{task.project_name} · {task.column_name}</p>
        </div>
        <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", priorityClasses[task.priority] ?? priorityClasses.normal)}>
          {task.priority}
        </span>
      </div>
      <div className="mt-3.5 flex items-center justify-between text-[11px]">
        <span className={cn("font-medium", task.is_overdue ? "text-destructive" : "text-muted-foreground/60")}>
          {task.due_date ? (task.is_overdue ? `Overdue · ${task.due_date}` : `Due ${task.due_date}`) : "No due date"}
        </span>
        <span className="text-primary/70 group-hover:text-primary transition-colors font-medium">Open →</span>
      </div>
    </Link>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const initials = member.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const roleColors: Record<string, string> = {
    manager: "text-primary border-primary/25 bg-primary/5",
    member:  "text-muted-foreground border-border bg-muted/30",
    viewer:  "text-muted-foreground/60 border-border/60 bg-muted/20",
  };
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/20">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={member.user.avatar_url || ""} />
        <AvatarFallback className="bg-muted text-[10px] font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-foreground">{member.user.full_name}</p>
        <p className="truncate text-[11px] text-muted-foreground/55">{member.user.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", roleColors[member.role] ?? roleColors.member)}>
          {member.role}
        </span>
        <Link href="/messages" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/20 hover:text-primary transition-colors">
          <MessageSquare size={11} />
        </Link>
      </div>
    </div>
  );
}
