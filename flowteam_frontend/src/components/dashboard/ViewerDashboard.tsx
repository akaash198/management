"use client";

import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import { Section, SectionLink, EmptyNote, ProjectCard, ActivityRow, getTimeOfDay } from "./shared";
import { Eye, Activity, Briefcase } from "lucide-react";

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
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-muted-foreground" />
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            You have read-only access to this workspace.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
          <Eye size={11} />
          View only
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* Projects */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <Briefcase size={14} className="text-primary" />
                Projects
              </h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {projectItems.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-5 text-[13px] text-muted-foreground">
                No projects available.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projectItems.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: activity */}
        <div>
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
      </div>
    </div>
  );
}
