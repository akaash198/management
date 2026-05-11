"use client";

import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ActivityRow,
  MiniMetric, QuickActionLink, RoleBadge, MemberRow, getTimeOfDay,
} from "./shared";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, AlertCircle, Activity, BarChart3,
  RefreshCcw, UserPlus, FolderPlus, Settings, ClipboardList,
  Shield, TrendingUp, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const pendingCount      = (members ?? []).filter((m) => m.role === "viewer").length;

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const sortedMembers = [...(members ?? [])].sort((a, b) => {
    const order = ["ceo","admin","manager","member","viewer"];
    return order.indexOf(a.role) - order.indexOf(b.role);
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <Shield size={13} className="text-blue-500" />
            </div>
            <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            Admin overview — team management and operational health
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh} disabled={isFetching}>
          <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total members"    value={totalMembers}   icon={Users}      iconColor="text-blue-500"    iconBg="bg-blue-50 dark:bg-blue-950/40"   href="/settings/members" />
        <StatCard title="Viewers / pending" value={pendingCount}  icon={UserPlus}   iconColor="text-amber-500"   iconBg="bg-amber-50 dark:bg-amber-950/40" href="/settings/members" />
        <StatCard title="Active projects"  value={activeProjects} icon={Briefcase}  iconColor="text-primary"     iconBg="bg-primary/8"                      href="/projects" />
        <StatCard title="Overdue tasks"    value={overdueTotal}   icon={AlertCircle} iconColor="text-destructive" iconBg="bg-destructive/8" danger={overdueTotal > 0} />
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
                data.activity.map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Section title="Quick actions" icon={<Plus size={13} className="text-muted-foreground" />}>
            <div className="grid gap-2 p-3">
              <QuickActionLink href="/settings/members?action=invite" icon={<UserPlus size={13} />}      label="Invite member"   description="Send an invitation" />
              <QuickActionLink href="/projects"                        icon={<FolderPlus size={13} />}    label="Create project"  description="New workstream" />
              <QuickActionLink href="/settings/audit-log"             icon={<ClipboardList size={13} />}  label="Audit log"       description="Review activity" />
              <QuickActionLink href="/settings"                        icon={<Settings size={13} />}      label="Team settings"   description="Configure workspace" />
            </div>
          </Section>

          <Section title="Capacity overview" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MiniMetric label="Created"   value={createdThisWeek}        tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek}      tone="success" />
              <MiniMetric label="Velocity"  value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue"   value={overdueTotal}           tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Team composition" icon={<TrendingUp size={13} className="text-muted-foreground" />}>
            <div className="space-y-2 p-3">
              {(["ceo","admin","manager","member","viewer"] as const).map((role) => {
                const count = (members ?? []).filter((m) => m.role === role).length;
                if (count === 0) return null;
                return (
                  <div key={role} className="flex items-center justify-between">
                    <RoleBadge role={role} />
                    <span className="text-[12px] font-semibold tabular-nums text-foreground">
                      {count} {count === 1 ? "person" : "people"}
                    </span>
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
