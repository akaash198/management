"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { DashboardData, ActivityItem as ActivityItemType, ProjectProgress } from "@/types/dashboard";
import type { TeamMember } from "@/types";

export type DashboardTask = DashboardData["my_tasks"]["recent"][number];
export type PriorityKey = keyof DashboardData["my_tasks"]["by_priority"];

// ─── Layout primitives ─────────────────────────────────────────────────────────

export function Section({
  title, icon, action, children,
}: {
  title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {icon}{title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-5 py-5 text-[13px] text-muted-foreground">{children}</p>;
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6 animate-pulse">
      <div className="h-7 w-52 rounded-lg bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="h-52 rounded-2xl bg-muted" />
        <div className="grid gap-4">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="h-56 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
        <div className="space-y-5">
          <div className="h-56 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ─── Shared cards ──────────────────────────────────────────────────────────────

export function StatCard({
  title, value, icon: Icon, iconColor, iconBg, danger, href,
}: {
  title: string; value: number | string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor: string; iconBg: string; danger?: boolean; href?: string;
}) {
  const inner = (
    <div className="group cursor-default rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] font-medium text-muted-foreground">{title}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <p className={cn("text-[28px] font-bold leading-none tracking-tight", danger && "text-destructive")}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function ProjectCard({ project }: { project: ProjectProgress }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-px hover:shadow-md">
        <div className="h-[3px] w-full" style={{ backgroundColor: project.color ?? "#5B5EDE" }} />
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
              {project.icon ?? "📋"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold transition-colors group-hover:text-primary">{project.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{project.status}</p>
            </div>
            <span className="ml-auto shrink-0 text-[11px] font-semibold text-muted-foreground">{project.progress_percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${project.progress_percent}%`, backgroundColor: project.color ?? "#5B5EDE" }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {(project.members ?? []).slice(0, 4).map((m) => (
                <div key={m.id}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[8px] font-bold uppercase text-primary"
                  title={m.full_name}>
                  {m.full_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
              ))}
              {(project.members ?? []).length > 4 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium text-muted-foreground">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {project.completed_tasks}/{project.total_tasks} tasks
              {project.overdue_count > 0 && (
                <span className="ml-1.5 text-destructive font-semibold">· {project.overdue_count} overdue</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TaskRow({ task }: { task: DashboardTask }) {
  return (
    <div className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium transition-colors group-hover:text-primary">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{task.project_name}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span className="text-[11px] text-muted-foreground/60">{task.column_name}</span>
        </div>
      </div>
      {task.due_date && (
        <span className={cn(
          "ml-4 shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold",
          task.is_overdue
            ? "border-destructive/20 bg-destructive/5 text-destructive"
            : "border-border bg-muted/40 text-muted-foreground"
        )}>
          {task.due_date}
        </span>
      )}
    </div>
  );
}

export function ActivityRow({ item }: { item: ActivityItemType }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
        <AvatarImage src={item.actor.avatar ?? ""} />
        <AvatarFallback className="bg-muted text-[10px] font-semibold">{item.actor.full_name[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{item.actor.full_name}</span>{" "}
          {item.verb} <span className="font-medium text-primary">{item.task_title}</span> in{" "}
          <span className="font-medium text-foreground/70">{item.project_name}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/50">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function PriorityPill({ priority }: { priority: PriorityKey }) {
  const classes: Record<PriorityKey, string> = {
    urgent: "border-red-200 bg-red-50 text-red-700",
    high: "border-amber-200 bg-amber-50 text-amber-700",
    normal: "border-primary/20 bg-primary/10 text-primary",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", classes[priority])}>
      {priority}
    </span>
  );
}

export function PriorityBar({ label, value, max }: { label: PriorityKey; value: number; max: number }) {
  const tones: Record<PriorityKey, string> = {
    urgent: "bg-red-500", high: "bg-amber-500", normal: "bg-primary", low: "bg-emerald-500",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium capitalize text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tones[label])} style={{ width: `${(value / Math.max(max, 1)) * 100}%` }} />
      </div>
    </div>
  );
}

export function MiniMetric({ label, value, tone }: { label: string; value: string | number; tone: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "bg-muted/50 text-foreground",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    danger:  "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  }[tone];
  return (
    <div className={cn("rounded-xl px-3 py-3", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-[20px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function QuickActionLink({ href, icon, label, description }: {
  href: string; icon: ReactNode; label: string; description: string;
}) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ceo:     "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300",
    admin:   "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    manager: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    member:  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    viewer:  "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[role] ?? styles.member)}>
      {role}
    </span>
  );
}

export function MemberRow({ member, action }: { member: TeamMember; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={member.user.avatar_url || ""} />
        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
          {(member.user.full_name || member.user.email).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{member.user.full_name || "—"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{member.user.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <RoleBadge role={member.role} />
        {action}
      </div>
    </div>
  );
}

export function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
