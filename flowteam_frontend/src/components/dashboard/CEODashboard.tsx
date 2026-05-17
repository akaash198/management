"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { MissedMessagesPulse } from "./MissedMessagesPulse";
import { InviteMemberModal } from "./InviteMemberModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ProjectCard, ActivityRow,
  MiniMetric, RoleBadge, MemberRow, VelocityGauge,
  getTimeOfDay,
} from "./shared";
import {
  Users, Briefcase, TrendingUp, AlertCircle, Activity, BarChart3,
  Gauge, RefreshCcw, UserPlus, FolderPlus, ClipboardList,
  ArrowUpRight, Crown, Plus, CheckCircle2, Target, Settings,
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

export function CEODashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const totalMembers        = data.team_stats.total_members;
  const activeProjects      = data.projects.active;
  const completedThisWeek   = data.team_stats.tasks_completed_this_week;
  const createdThisWeek     = data.team_stats.tasks_created_this_week;
  const overdueTotal        = data.my_tasks.overdue;
  const mostActiveMember    = data.team_stats.most_active_member;

  const deliveryVelocity = Math.min(100, Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100));

  const orgHealthScore = useMemo(() => {
    const velocityScore = deliveryVelocity;
    const overdueRatio  = Math.max(0, 100 - (overdueTotal / Math.max(data.my_tasks.total, 1)) * 200);
    const projectScore  = data.projects.total > 0 ? Math.min(100, (activeProjects / data.projects.total) * 100) : 0;
    return Math.round(velocityScore * 0.5 + overdueRatio * 0.3 + projectScore * 0.2);
  }, [deliveryVelocity, overdueTotal, data, activeProjects]);

  const topProjects = useMemo(
    () => [...(data.projects.items ?? [])].sort((a, b) => b.overdue_count - a.overdue_count || b.progress_percent - a.progress_percent).slice(0, 4),
    [data.projects.items]
  );
  const atRiskProjects = useMemo(() => (data.projects.items ?? []).filter((p) => p.overdue_count >= 2), [data.projects.items]);
  const leadershipMembers = useMemo(() => (members ?? []).filter((m) => ["ceo","admin","manager"].includes(m.role)), [members]);

  const roleCounts = useMemo(() =>
    (["ceo","admin","manager","member","viewer"] as const).map((role) => ({
      role, count: (members ?? []).filter((m) => m.role === role).length,
    })).filter((r) => r.count > 0),
    [members]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} teamId={activeTeamId} canInviteManager onSuccess={onRefresh} />
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />
      <MissedMessagesPulse />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40">
              <Crown size={12} className="text-violet-500" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Executive overview
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5 h-8 text-[12px]">
            <UserPlus size={12} />Invite
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
              {atRiskProjects.length} project{atRiskProjects.length > 1 ? "s are" : " is"} at risk
            </p>
            <p className="text-[11.5px] text-destructive/70 truncate">{atRiskProjects.map((p) => p.name).join(" · ")}</p>
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
        <StatCard title="Total members"       value={totalMembers}      icon={Users}       iconColor="text-violet-500"  iconBg="bg-violet-50 dark:bg-violet-950/40"  href="/settings/members" />
        <StatCard title="Active projects"     value={activeProjects}    icon={Briefcase}   iconColor="text-primary"     iconBg="bg-primary/10"                        href="/projects" />
        <StatCard title="Completed this week" value={completedThisWeek} icon={TrendingUp}  iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
        <StatCard title="Overdue tasks"       value={overdueTotal}      icon={AlertCircle} iconColor="text-destructive" iconBg="bg-destructive/10" danger={overdueTotal > 0} />
      </div>

      {/* ── Org pulse ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
            <Target size={10} className="text-muted-foreground" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Organisation pulse</span>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold",
            orgHealthScore >= 75 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
              : orgHealthScore >= 50 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
              : "border-destructive/20 bg-destructive/5 text-destructive"
          )}>
            {orgHealthScore >= 75 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            Health: {orgHealthScore}/100
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OrgStat label="Delivery velocity" value={`${deliveryVelocity}%`} sub="completed vs created" tone={deliveryVelocity >= 75 ? "success" : "warning"} />
          <OrgStat label="Most active"       value={mostActiveMember?.full_name ?? "—"} sub="this week"        tone="neutral" />
          <OrgStat label="Tasks created"     value={createdThisWeek}                    sub="this week"         tone="neutral" />
          <OrgStat label="Total projects"    value={data.projects.total}               sub="across the org"   tone="neutral" />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* Project portfolio */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                Project portfolio
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">{data.projects.items.length} projects</span>
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCreateProjectOpen(true)} className="h-7 gap-1 text-[11.5px]">
                  <Plus size={11} />New
                </Button>
                <SectionLink href="/projects">View all</SectionLink>
              </div>
            </div>
            {topProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8">
                <p className="text-[12.5px] text-muted-foreground">No active projects.</p>
                <Button size="sm" onClick={() => setCreateProjectOpen(true)} className="gap-1.5 text-[12px]"><Plus size={12} />Create first project</Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {topProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* Leadership team */}
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
                data.activity.slice(0, 10).map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border/60 px-5 py-3 bg-muted/5">
              <h2 className="text-[12.5px] font-semibold text-foreground flex items-center gap-2"><Plus size={13} className="text-muted-foreground" />Quick actions</h2>
            </div>
            <div className="grid gap-2 p-3">
              <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group text-left">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><UserPlus size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-foreground">Invite member</div><div className="text-[11px] text-muted-foreground/70">Grow the team</div></div>
                <ArrowUpRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </button>
              <button type="button" onClick={() => setCreateProjectOpen(true)} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group text-left">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><FolderPlus size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-foreground">New project</div><div className="text-[11px] text-muted-foreground/70">Start a workstream</div></div>
                <ArrowUpRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </button>
              <Link href="/settings/audit-log" className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><ClipboardList size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-foreground">Audit log</div><div className="text-[11px] text-muted-foreground/70">Review all activity</div></div>
                <ArrowUpRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </Link>
              <Link href="/settings" className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors"><Settings size={13} /></div>
                <div><div className="text-[12.5px] font-semibold text-foreground">Team settings</div><div className="text-[11px] text-muted-foreground/70">Configure workspace</div></div>
                <ArrowUpRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Velocity */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Delivery velocity</p>
            <div className="flex items-center justify-center py-2">
              <VelocityGauge pct={deliveryVelocity} label="completed vs created" />
            </div>
          </div>

          <Section title="Execution metrics" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MiniMetric label="Created"   value={createdThisWeek}        tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek}      tone="success" />
              <MiniMetric label="Velocity"  value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue"   value={overdueTotal}           tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Role distribution" icon={<Gauge size={13} className="text-muted-foreground" />}>
            <div className="space-y-2.5 p-3">
              {roleCounts.map(({ role, count }) => (
                <div key={role} className="flex items-center justify-between">
                  <RoleBadge role={role} />
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${(count / Math.max(totalMembers, 1)) * 100}%` }} />
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

function OrgStat({ label, value, sub, tone }: { label: string; value: string | number; sub: string; tone: "neutral" | "success" | "warning" }) {
  const val = { neutral: "text-foreground", success: "text-emerald-600 dark:text-emerald-400", warning: "text-amber-600 dark:text-amber-400" }[tone];
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">{label}</p>
      <p className={cn("mt-2 text-[20px] font-bold tracking-[-0.03em] leading-none truncate", val)}>{value}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground/50">{sub}</p>
    </div>
  );
}
