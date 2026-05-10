"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, ActivityRow,
  MiniMetric, QuickActionLink, RoleBadge, MemberRow, getTimeOfDay, capitalize,
  type DashboardTask,
} from "./shared";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, TrendingUp, AlertCircle, Activity, BarChart3,
  Gauge, Plus, RefreshCcw, UserPlus, FolderPlus, ClipboardList,
  ArrowUpRight, Crown, Zap,
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

export function CEODashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const totalMembers = data.team_stats.total_members;
  const activeProjects = data.projects.active;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek = data.team_stats.tasks_created_this_week;
  const overdueTotal = data.my_tasks.overdue;

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const mostActiveMember = data.team_stats.most_active_member;

  const topProjects = [...(data.projects.items ?? [])]
    .sort((a, b) => b.progress_percent - a.progress_percent)
    .slice(0, 4);

  const ceoMembers = (members ?? []).filter((m) => m.role === "ceo");
  const admins = (members ?? []).filter((m) => m.role === "admin");
  const managers = (members ?? []).filter((m) => m.role === "manager");

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-violet-600" />
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Executive overview — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={isFetching}>
            <RefreshCcw size={13} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total members"
          value={totalMembers}
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-950/40"
          href="/settings/members"
        />
        <StatCard
          title="Active projects"
          value={activeProjects}
          icon={Briefcase}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          href="/projects"
        />
        <StatCard
          title="Completed this week"
          value={completedThisWeek}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard
          title="Overdue tasks"
          value={overdueTotal}
          icon={AlertCircle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          danger={overdueTotal > 0}
        />
      </div>

      {/* Organisation health hero */}
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,rgba(139,92,246,0.07),rgba(139,92,246,0.02)_45%,rgba(255,255,255,0.97)_100%)] p-6 shadow-sm dark:border-violet-900/30 dark:bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(0,0,0,0)_80%)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
            <Zap size={11} />
            Organisation pulse
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OrgStat label="Delivery velocity" value={`${deliveryVelocity}%`} sub="completed vs created" tone={deliveryVelocity >= 75 ? "success" : "warning"} />
          <OrgStat label="Most active" value={mostActiveMember?.full_name ?? "—"} sub="this week" tone="neutral" />
          <OrgStat label="Created this week" value={createdThisWeek} sub="new tasks" tone="neutral" />
          <OrgStat label="Total projects" value={data.projects.total} sub="across the org" tone="neutral" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Project portfolio */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Project portfolio</h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {topProjects.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-5 text-[13px] text-muted-foreground">No active projects.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {topProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* Leadership roster */}
          <Section title="Leadership team" icon={<Users size={14} className="text-violet-600" />} action={<SectionLink href="/settings/members">Manage</SectionLink>}>
            {[...ceoMembers, ...admins, ...managers].length === 0 ? (
              <EmptyNote>No leadership members found.</EmptyNote>
            ) : (
              <div className="divide-y divide-border">
                {[...ceoMembers, ...admins, ...managers].map((m) => (
                  <MemberRow key={m.user.id} member={m} />
                ))}
              </div>
            )}
          </Section>

          {/* Team activity */}
          <Section title="Team activity" icon={<Activity size={14} className="text-muted-foreground" />}>
            <div className="divide-y divide-border">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Section title="Quick actions" icon={<Plus size={14} className="text-muted-foreground" />}>
            <div className="grid gap-3 p-4">
              <QuickActionLink href="/settings/members?action=invite" icon={<UserPlus size={14} />} label="Invite member" description="Grow the team" />
              <QuickActionLink href="/projects" icon={<FolderPlus size={14} />} label="Create project" description="Start a new workstream" />
              <QuickActionLink href="/settings/audit-log" icon={<ClipboardList size={14} />} label="Audit log" description="Review all activity" />
              <QuickActionLink href="/settings" icon={<ArrowUpRight size={14} />} label="Team settings" description="Manage your workspace" />
            </div>
          </Section>

          <Section title="Execution metrics" icon={<BarChart3 size={14} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-3 p-4">
              <MiniMetric label="Created" value={createdThisWeek} tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek} tone="success" />
              <MiniMetric label="Velocity" value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue" value={overdueTotal} tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Role distribution" icon={<Gauge size={14} className="text-muted-foreground" />}>
            <div className="space-y-2.5 p-4">
              {(["ceo", "admin", "manager", "member", "viewer"] as const).map((role) => {
                const count = (members ?? []).filter((m) => m.role === role).length;
                return (
                  <div key={role} className="flex items-center justify-between text-[12px]">
                    <RoleBadge role={role} />
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function OrgStat({ label, value, sub, tone }: { label: string; value: string | number; sub: string; tone: "neutral" | "success" | "warning" }) {
  const bg = { neutral: "border-white/70 bg-white/80 dark:border-white/10 dark:bg-white/5", success: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/40", warning: "border-amber-100 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/40" }[tone];
  const val = { neutral: "text-foreground", success: "text-emerald-700 dark:text-emerald-400", warning: "text-amber-700 dark:text-amber-400" }[tone];
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", bg)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={cn("mt-3 text-[22px] font-semibold tracking-tight", val)}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
