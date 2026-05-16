"use client";

import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import { Section, SectionLink, EmptyNote, ProjectCard, ActivityRow, StatCard, getTimeOfDay } from "./shared";
import { Eye, Activity, Briefcase, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
}

export function ViewerDashboard({ data, members, activeTeamId }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const projectItems = data.projects.items ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted/70 border border-border">
              <Eye size={12} className="text-muted-foreground" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Read-only access
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground shrink-0">
          <Eye size={10} />
          View only
        </span>
      </div>

      {/* ── At-a-glance stats ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Active projects" value={data.projects.active}  icon={Briefcase}   iconColor="text-primary"    iconBg="bg-primary/10" />
        <StatCard title="Team members"    value={data.team_stats.total_members} icon={Users} iconColor="text-violet-500" iconBg="bg-violet-50 dark:bg-violet-950/40" />
        <StatCard title="Completed tasks" value={data.team_stats.tasks_completed_this_week} icon={TrendingUp} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                <Briefcase size={13} className="text-primary" />
                Projects
                <span className="text-[11px] font-normal text-muted-foreground">({projectItems.length})</span>
              </h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {projectItems.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-5 text-[12.5px] text-muted-foreground">
                No projects available.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projectItems.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
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
      </div>
    </div>
  );
}
