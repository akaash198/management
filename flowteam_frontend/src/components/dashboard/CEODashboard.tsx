"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, ActivityRow,
  MiniMetric, QuickActionLink, RoleBadge, MemberRow, getTimeOfDay,
} from "./shared";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, TrendingUp, AlertCircle, Activity, BarChart3,
  Gauge, RefreshCcw, UserPlus, FolderPlus, ClipboardList,
  ArrowUpRight, Crown, Zap, Plus,
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

  const totalMembers        = data.team_stats.total_members;
  const activeProjects      = data.projects.active;
  const completedThisWeek   = data.team_stats.tasks_completed_this_week;
  const createdThisWeek     = data.team_stats.tasks_created_this_week;
  const overdueTotal        = data.my_tasks.overdue;
  const mostActiveMember    = data.team_stats.most_active_member;

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const topProjects = useMemo(
    () => [...(data.projects.items ?? [])].sort((a, b) => b.progress_percent - a.progress_percent).slice(0, 4),
    [data.projects.items]
  );

  const leadershipMembers = useMemo(
    () => (members ?? []).filter((m) => ["ceo","admin","manager"].includes(m.role)),
    [members]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
              <Crown size={13} className="text-violet-500" />
            </div>
            <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" · "}Executive overview
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh} disabled={isFetching}>
          <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total members"      value={totalMembers}      icon={Users}        iconColor="text-violet-500" iconBg="bg-violet-50 dark:bg-violet-950/40" href="/settings/members" />
        <StatCard title="Active projects"    value={activeProjects}    icon={Briefcase}    iconColor="text-primary"    iconBg="bg-primary/8"                         href="/projects" />
        <StatCard title="Completed this week" value={completedThisWeek} icon={TrendingUp}   iconColor="text-primary"    iconBg="bg-primary/8" />
        <StatCard title="Overdue tasks"      value={overdueTotal}      icon={AlertCircle}  iconColor="text-destructive" iconBg="bg-destructive/8" danger={overdueTotal > 0} />
      </div>

      {/* ── Org pulse banner ── */}
      <div className="overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/60 via-background to-background p-5 dark:border-violet-900/20 dark:from-violet-950/20 dark:to-transparent shadow-2xs">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-white/70 px-2.5 py-1 dark:border-violet-800/50 dark:bg-violet-950/50">
            <Zap size={10} className="text-violet-500" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-violet-600 dark:text-violet-300">Organisation pulse</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OrgStat
            label="Delivery velocity"
            value={`${deliveryVelocity}%`}
            sub="completed vs created"
            tone={deliveryVelocity >= 75 ? "success" : "warning"}
          />
          <OrgStat label="Most active"       value={mostActiveMember?.full_name ?? "—"} sub="this week"       tone="neutral" />
          <OrgStat label="Created this week" value={createdThisWeek}                    sub="new tasks"        tone="neutral" />
          <OrgStat label="Total projects"    value={data.projects.total}                sub="across the org"  tone="neutral" />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* Project portfolio */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">Project portfolio</h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {topProjects.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-5 text-[12.5px] text-muted-foreground">
                No active projects.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {topProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* Leadership roster */}
          <Section
            title="Leadership team"
            icon={<Users size={13} className="text-violet-500" />}
            action={<SectionLink href="/settings/members">Manage</SectionLink>}
          >
            {leadershipMembers.length === 0 ? (
              <EmptyNote>No leadership members found.</EmptyNote>
            ) : (
              <div className="divide-y divide-border/60">
                {leadershipMembers.map((m) => <MemberRow key={m.user.id} member={m} />)}
              </div>
            )}
          </Section>

          {/* Team activity */}
          <Section title="Team activity" icon={<Activity size={13} className="text-muted-foreground" />}>
            <div className="divide-y divide-border/60">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Section title="Quick actions" icon={<Plus size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <QuickActionLink href="/settings/members?action=invite" icon={<UserPlus size={13} />}    label="Invite member"   description="Grow the team" />
              <QuickActionLink href="/projects"                        icon={<FolderPlus size={13} />}  label="Create project"  description="New workstream" />
              <QuickActionLink href="/settings/audit-log"             icon={<ClipboardList size={13} />} label="Audit log"      description="Review activity" />
              <QuickActionLink href="/settings"                        icon={<ArrowUpRight size={13} />} label="Team settings"  description="Manage workspace" />
            </div>
          </Section>

          <Section title="Execution metrics" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MiniMetric label="Created"   value={createdThisWeek}       tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek}     tone="success" />
              <MiniMetric label="Velocity"  value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue"   value={overdueTotal}          tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Role distribution" icon={<Gauge size={13} className="text-muted-foreground" />}>
            <div className="space-y-2 p-3">
              {(["ceo","admin","manager","member","viewer"] as const).map((role) => {
                const count = (members ?? []).filter((m) => m.role === role).length;
                return (
                  <div key={role} className="flex items-center justify-between">
                    <RoleBadge role={role} />
                    <span className="text-[12px] font-semibold tabular-nums text-foreground">{count}</span>
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

function OrgStat({
  label, value, sub, tone,
}: {
  label: string; value: string | number; sub: string;
  tone: "neutral" | "success" | "warning";
}) {
  const val = {
    neutral: "text-foreground",
    success: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="rounded-xl border border-white/60 bg-white/70 p-4 dark:border-white/8 dark:bg-white/4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">{label}</p>
      <p className={cn("mt-2.5 text-[20px] font-semibold tracking-[-0.03em] leading-none", val)}>{value}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground/50">{sub}</p>
    </div>
  );
}
