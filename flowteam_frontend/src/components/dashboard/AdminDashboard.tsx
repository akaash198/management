"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ActivityRow,
  MiniMetric, QuickActionLink, RoleBadge, MemberRow, VelocityGauge,
  getTimeOfDay,
} from "./shared";
import { MissedMessagesPulse } from "./MissedMessagesPulse";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, AlertCircle, Activity, BarChart3,
  RefreshCcw, UserPlus, FolderPlus, Settings, ClipboardList,
  Shield, TrendingUp, Plus, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
  onRefresh: () => void;
  isFetching: boolean;
}

export function AdminDashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const totalMembers      = data.team_stats.total_members;
  const activeProjects    = data.projects.active;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek   = data.team_stats.tasks_created_this_week;
  const overdueTotal      = data.my_tasks.overdue;
  const viewerCount       = (members ?? []).filter((m) => m.role === "viewer").length;

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const sortedMembers = useMemo(
    () => [...(members ?? [])].sort((a, b) => {
      const order = ["ceo","admin","manager","member","viewer"];
      return order.indexOf(a.role) - order.indexOf(b.role);
    }),
    [members]
  );

  const roleCounts = useMemo(
    () => (["ceo","admin","manager","member","viewer"] as const).map((role) => ({
      role,
      count: (members ?? []).filter((m) => m.role === role).length,
    })).filter((r) => r.count > 0),
    [members]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">

      {/* ── Missed Messages Briefing ── */}
      <MissedMessagesPulse />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40">
              <Shield size={12} className="text-blue-500" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Admin overview
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 shrink-0" onClick={onRefresh} disabled={isFetching}>
          <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── Viewer callout ── */}
      {viewerCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 px-5 py-3.5">
          <UserPlus size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
            {viewerCount} viewer{viewerCount > 1 ? "s" : ""} with limited access — consider promoting them to member
          </p>
          <Link
            href="/settings/members"
            className="ml-auto shrink-0 rounded-lg border border-amber-300/50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors dark:border-amber-700/30 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            Manage →
          </Link>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total members"    value={totalMembers}   icon={Users}       iconColor="text-blue-500"    iconBg="bg-blue-50 dark:bg-blue-950/40"       href="/settings/members" />
        <StatCard title="Viewers / limited" value={viewerCount}   icon={UserPlus}    iconColor="text-amber-500"   iconBg="bg-amber-50 dark:bg-amber-950/40"     href="/settings/members" />
        <StatCard title="Active projects"  value={activeProjects} icon={Briefcase}   iconColor="text-primary"     iconBg="bg-primary/10"                         href="/projects" />
        <StatCard title="Overdue tasks"    value={overdueTotal}   icon={AlertCircle} iconColor="text-destructive" iconBg="bg-destructive/10" danger={overdueTotal > 0} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* Member roster */}
          <Section
            title="Member roster"
            icon={<Users size={13} className="text-blue-500" />}
            action={<SectionLink href="/settings/members">Manage members</SectionLink>}
          >
            {sortedMembers.length === 0 ? (
              <EmptyNote>No members found.</EmptyNote>
            ) : (
              <div className="divide-y divide-border/60">
                {sortedMembers.map((m) => <MemberRow key={m.user.id} member={m} />)}
              </div>
            )}
          </Section>

          {/* Team activity */}
          <Section title="Team activity" icon={<Activity size={13} className="text-muted-foreground" />}>
            <div className="divide-y divide-border/60">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.slice(0, 10).map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          <Section title="Quick actions" icon={<Plus size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <QuickActionLink href="/settings/members?action=invite" icon={<UserPlus size={13} />}       label="Invite member"   description="Send an invitation" />
              <QuickActionLink href="/projects"                        icon={<FolderPlus size={13} />}     label="Create project"  description="New workstream" />
              <QuickActionLink href="/settings/audit-log"             icon={<ClipboardList size={13} />}   label="Audit log"       description="Review activity" />
              <QuickActionLink href="/settings"                        icon={<Settings size={13} />}       label="Team settings"   description="Configure workspace" />
            </div>
          </Section>

          {/* Velocity */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
              Delivery velocity
            </p>
            <div className="flex items-center justify-center py-2">
              <VelocityGauge pct={deliveryVelocity} label="completed vs created" />
            </div>
          </div>

          <Section title="Capacity this week" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MiniMetric label="Created"   value={createdThisWeek}        tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek}      tone="success" />
              <MiniMetric label="Velocity"  value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue"   value={overdueTotal}           tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Team composition" icon={<TrendingUp size={13} className="text-muted-foreground" />}>
            <div className="space-y-2.5 p-3">
              {roleCounts.map(({ role, count }) => (
                <div key={role} className="flex items-center justify-between">
                  <RoleBadge role={role} />
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${(count / Math.max(totalMembers, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums text-foreground w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
