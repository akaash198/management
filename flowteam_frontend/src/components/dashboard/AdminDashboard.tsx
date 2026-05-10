"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
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

  const totalMembers = data.team_stats.total_members;
  const activeProjects = data.projects.active;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek = data.team_stats.tasks_created_this_week;
  const overdueTotal = data.my_tasks.overdue;

  // Pending invites: members with no tasks (heuristic — backend doesn't expose pending invites count here)
  const pendingCount = (members ?? []).filter((m) => m.role === "viewer").length;

  const deliveryVelocity = Math.min(
    100,
    Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100)
  );

  const sortedMembers = [...(members ?? [])].sort((a, b) => {
    const order = ["ceo", "admin", "manager", "member", "viewer"];
    return order.indexOf(a.role) - order.indexOf(b.role);
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Admin overview — team management and operational health
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
          title="Total members"
          value={totalMembers}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          href="/settings/members"
        />
        <StatCard
          title="Viewers / pending"
          value={pendingCount}
          icon={UserPlus}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-950/40"
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
          title="Overdue tasks"
          value={overdueTotal}
          icon={AlertCircle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          danger={overdueTotal > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Member roster */}
          <Section
            title="Member roster"
            icon={<Users size={14} className="text-blue-600" />}
            action={<SectionLink href="/settings/members">Manage members</SectionLink>}
          >
            {sortedMembers.length === 0 ? (
              <EmptyNote>No members found.</EmptyNote>
            ) : (
              <div className="divide-y divide-border">
                {sortedMembers.map((m) => (
                  <MemberRow key={m.user.id} member={m} />
                ))}
              </div>
            )}
          </Section>

          {/* Team activity */}
          <Section
            title="Team activity"
            icon={<Activity size={14} className="text-muted-foreground" />}
          >
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
              <QuickActionLink href="/settings/members?action=invite" icon={<UserPlus size={14} />} label="Invite member" description="Send an invitation" />
              <QuickActionLink href="/projects" icon={<FolderPlus size={14} />} label="Create project" description="Start a new workstream" />
              <QuickActionLink href="/settings/audit-log" icon={<ClipboardList size={14} />} label="Audit log" description="Review all activity" />
              <QuickActionLink href="/settings" icon={<Settings size={14} />} label="Team settings" description="Configure your workspace" />
            </div>
          </Section>

          <Section title="Capacity overview" icon={<BarChart3 size={14} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-3 p-4">
              <MiniMetric label="Created" value={createdThisWeek} tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek} tone="success" />
              <MiniMetric label="Velocity" value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue" value={overdueTotal} tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Team composition" icon={<TrendingUp size={14} className="text-muted-foreground" />}>
            <div className="space-y-2.5 p-4">
              {(["ceo", "admin", "manager", "member", "viewer"] as const).map((role) => {
                const count = (members ?? []).filter((m) => m.role === role).length;
                if (count === 0) return null;
                return (
                  <div key={role} className="flex items-center justify-between text-[12px]">
                    <RoleBadge role={role} />
                    <span className="font-medium text-foreground">{count} {count === 1 ? "person" : "people"}</span>
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
