"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h2 className="flex items-center gap-2 text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">
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
    <Link href={href} className="flex items-center gap-0.5 text-[11.5px] font-semibold text-primary/70 hover:text-primary transition-colors">
      {children}
      <ArrowUpRight size={11} className="opacity-60" />
    </Link>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-6 text-[12.5px] text-muted-foreground/70 italic">
      {children}
    </p>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted" />)}
      </div>
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="h-52 rounded-2xl bg-muted" />
          <div className="h-64 rounded-2xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-44 rounded-2xl bg-muted" />
          <div className="h-36 rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

export function StatCard({
  title, value, icon: Icon, iconColor, iconBg, danger, href,
}: {
  title: string; value: number | string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor: string; iconBg: string; danger?: boolean; href?: string;
}) {
  const inner = (
    <div className={cn(
      "group rounded-2xl border border-border bg-card p-5 transition-all duration-150",
      "hover:shadow-sm hover:border-border-strong",
      href && "cursor-pointer"
    )}>
      <div className="mb-4 flex items-start justify-between">
        <p className="text-[11.5px] font-medium tracking-[-0.01em] text-muted-foreground leading-snug">{title}</p>
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
      </div>
      <p className={cn(
        "text-[30px] font-semibold leading-none tracking-[-0.04em]",
        danger ? "text-destructive" : "text-foreground"
      )}>
        {value}
      </p>
      {href && (
        <p className="mt-2.5 text-[11px] font-medium text-primary/60 group-hover:text-primary transition-colors">
          View details →
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Project card ──────────────────────────────────────────────────────────────

export function ProjectCard({ project }: { project: ProjectProgress }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-150 hover:shadow-sm hover:border-border-strong">
        {/* Color accent strip */}
        <div className="h-[3px] w-full" style={{ backgroundColor: project.color ?? "#82B4AA" }} />
        <div className="p-4">
          {/* Header */}
          <div className="mb-3.5 flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-[15px]">
              {project.icon ?? "📋"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold tracking-[-0.01em] group-hover:text-primary transition-colors">
                {project.name}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                {project.status}
              </p>
            </div>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">
              {project.progress_percent}%
            </span>
          </div>

          {/* Progress */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/70">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${project.progress_percent}%`, backgroundColor: project.color ?? "#82B4AA" }}
            />
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {(project.members ?? []).slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[8px] font-bold uppercase text-primary"
                  title={m.full_name}
                >
                  {m.full_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
              ))}
              {(project.members ?? []).length > 4 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium text-muted-foreground">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/70 tabular-nums">
              {project.completed_tasks}/{project.total_tasks} tasks
              {project.overdue_count > 0 && (
                <span className="ml-1.5 font-semibold text-destructive">· {project.overdue_count} late</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Task row ──────────────────────────────────────────────────────────────────

export function TaskRow({ task }: { task: DashboardTask }) {
  return (
    <div className="group flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/25">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium tracking-[-0.01em] group-hover:text-primary transition-colors">
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground/70">{task.project_name}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-border-strong" />
          <span className="text-[11px] text-muted-foreground/50">{task.column_name}</span>
        </div>
      </div>
      {task.due_date && (
        <span className={cn(
          "shrink-0 rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums",
          task.is_overdue
            ? "border-destructive/20 bg-destructive/6 text-destructive"
            : "border-border bg-muted/50 text-muted-foreground"
        )}>
          {task.due_date}
        </span>
      )}
    </div>
  );
}

// ─── Activity row ──────────────────────────────────────────────────────────────

export function ActivityRow({ item }: { item: ActivityItemType }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Avatar className="mt-0.5 h-6 w-6 shrink-0">
        <AvatarImage src={item.actor.avatar ?? ""} />
        <AvatarFallback className="bg-primary/8 text-[9px] font-bold text-primary">
          {item.actor.full_name[0]}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{item.actor.full_name}</span>
          {" "}{item.verb}{" "}
          <span className="font-medium text-primary">{item.task_title}</span>
          {" "}in{" "}
          <span className="font-medium text-foreground/65">{item.project_name}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/45">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// ─── Priority pill ─────────────────────────────────────────────────────────────

export function PriorityPill({ priority }: { priority: PriorityKey }) {
  const classes: Record<PriorityKey, string> = {
    urgent: "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400",
    high:   "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400",
    normal: "border-primary/20 bg-primary/8 text-primary",
    low:    "border-border bg-muted/60 text-muted-foreground",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
      classes[priority]
    )}>
      {priority}
    </span>
  );
}

// ─── Priority bar ──────────────────────────────────────────────────────────────

export function PriorityBar({ label, value, max }: { label: PriorityKey; value: number; max: number }) {
  const tones: Record<PriorityKey, string> = {
    urgent: "bg-red-500",
    high:   "bg-amber-500",
    normal: "bg-primary",
    low:    "bg-muted-foreground/40",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-medium capitalize text-foreground">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tones[label])}
          style={{ width: `${(value / Math.max(max, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Mini metric ───────────────────────────────────────────────────────────────

export function MiniMetric({
  label, value, tone,
}: {
  label: string; value: string | number; tone: "neutral" | "success" | "warning" | "danger";
}) {
  const valueColor = {
    neutral: "text-foreground",
    success: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
    danger:  "text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">{label}</p>
      <p className={cn("mt-1.5 text-[22px] font-semibold tracking-[-0.03em] leading-none", valueColor)}>{value}</p>
    </div>
  );
}

// ─── Quick action link ─────────────────────────────────────────────────────────

export function QuickActionLink({
  href, icon, label, description,
}: {
  href: string; icon: ReactNode; label: string; description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 transition-all duration-150 hover:border-primary/20 hover:bg-primary/3 group"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground/70">{description}</div>
      </div>
      <ArrowUpRight size={12} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
    </Link>
  );
}

// ─── Role badge ────────────────────────────────────────────────────────────────

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ceo:     "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40",
    admin:   "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40",
    manager: "bg-primary/6 text-primary border-primary/15",
    member:  "bg-muted/60 text-muted-foreground border-border",
    viewer:  "bg-muted/40 text-muted-foreground/60 border-border/60",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
      styles[role] ?? styles.member
    )}>
      {role}
    </span>
  );
}

// ─── Member row ────────────────────────────────────────────────────────────────

export function MemberRow({ member, action }: { member: TeamMember; action?: ReactNode }) {
  const initials = (member.user.full_name || member.user.email)
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={member.user.avatar_url || ""} />
        <AvatarFallback className="bg-primary/8 text-[10px] font-semibold text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium tracking-[-0.01em] text-foreground">
          {member.user.full_name || "—"}
        </p>
        <p className="truncate text-[11px] text-muted-foreground/60">{member.user.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <RoleBadge role={member.role} />
        {action}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
