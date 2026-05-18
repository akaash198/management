"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, TrendingDown, TrendingUp as TrendingUpIcon, Minus, AlertTriangle, Crown, Shield, Briefcase, User, Eye } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { DashboardData, ActivityItem as ActivityItemType, ProjectProgress } from "@/types/dashboard";
import type { TeamMember } from "@/types";

export type DashboardTask = DashboardData["my_tasks"]["recent"][number];
export type PriorityKey = keyof DashboardData["my_tasks"]["by_priority"];

// ─── Layout primitives ─────────────────────────────────────────────────────────

export function Section({
  title, icon, action, children, className,
}: {
  title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 bg-muted/5">
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
  title, value, icon: Icon, iconColor, iconBg, danger, href, delta, deltaLabel,
}: {
  title: string; value: number | string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor: string; iconBg: string; danger?: boolean; href?: string;
  delta?: number; deltaLabel?: string;
}) {
  const inner = (
    <div className={cn(
      "group rounded-2xl border border-border bg-card p-5 transition-all duration-200",
      "shadow-sm hover:shadow-md hover:-translate-y-0.5",
      href && "cursor-pointer"
    )}>
      <div className="mb-3 flex items-start justify-between">
        <p className="text-[11.5px] font-medium tracking-[-0.01em] text-muted-foreground leading-snug">{title}</p>
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
      </div>
      <p className={cn(
        "text-[28px] font-bold leading-none tracking-[-0.04em]",
        danger ? "text-destructive" : "text-foreground"
      )}>
        {value}
      </p>
      {delta !== undefined ? (
        <div className="mt-2 flex items-center gap-1">
          {delta > 0 ? (
            <TrendingUpIcon size={10} className={danger ? "text-destructive" : "text-emerald-500"} />
          ) : delta < 0 ? (
            <TrendingDown size={10} className={danger ? "text-emerald-500" : "text-destructive"} />
          ) : (
            <Minus size={10} className="text-muted-foreground/40" />
          )}
          <span className={cn(
            "text-[10.5px] font-medium",
            delta === 0 ? "text-muted-foreground/40"
              : (delta > 0) === !danger ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}>
            {delta > 0 ? "+" : ""}{delta} {deltaLabel ?? "vs last week"}
          </span>
        </div>
      ) : href ? (
        <p className="mt-2.5 text-[11px] font-medium text-primary/50 group-hover:text-primary transition-colors">
          View details →
        </p>
      ) : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Project card ──────────────────────────────────────────────────────────────

export function ProjectCard({ project }: { project: ProjectProgress }) {
  const health = project.overdue_count > 0
    ? (project.overdue_count >= 3 ? "at-risk" : "warning")
    : "on-track";

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
        <div className="h-[3px] w-full" style={{ backgroundColor: project.color ?? "#7CFFCB" }} />
        <div className="p-4">
          <div className="mb-3 flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-[15px]">
              {project.icon ?? "📋"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold tracking-[-0.01em] group-hover:text-primary transition-colors">
                {project.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                  {project.status}
                </span>
                {health !== "on-track" && (
                  <>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                    <span className={cn(
                      "text-[10px] font-semibold",
                      health === "at-risk" ? "text-destructive" : "text-amber-500"
                    )}>
                      {health === "at-risk" ? "At risk" : "Watch"}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="shrink-0 text-[13px] font-bold tabular-nums" style={{ color: project.color ?? undefined }}>
              {project.progress_percent}%
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${project.progress_percent}%`, backgroundColor: project.color ?? "#7CFFCB" }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {(project.members ?? []).slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-bold uppercase text-muted-foreground"
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
              {project.completed_tasks}/{project.total_tasks} done
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

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high:   "bg-amber-500",
  normal: "bg-primary",
  low:    "bg-muted-foreground/30",
};

function formatDueDate(due: string | null): { label: string; tone: "danger" | "warning" | "muted" } {
  if (!due) return { label: "No date", tone: "muted" };
  const d = new Date(due);
  if (isPast(d) && !isToday(d)) return { label: `Overdue · ${format(d, "MMM d")}`, tone: "danger" };
  if (isToday(d)) return { label: "Due today", tone: "warning" };
  if (isTomorrow(d)) return { label: "Tomorrow", tone: "muted" };
  return { label: format(d, "MMM d"), tone: "muted" };
}

export function TaskRow({ task, onComplete }: { task: DashboardTask; onComplete?: (id: string) => void }) {
  const { label, tone } = formatDueDate(task.due_date ?? null);
  const isDone = (task as any).is_done ?? false;

  return (
    <div className={cn(
      "group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20",
      isDone && "opacity-50"
    )}>
      {onComplete ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onComplete(task.id); }}
          className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors"
        >
          {isDone ? <CheckCircle2 size={15} className="text-primary" /> : <Circle size={15} />}
        </button>
      ) : (
        <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.normal)} />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate text-[12.5px] font-medium tracking-[-0.01em] group-hover:text-primary transition-colors",
          isDone && "line-through"
        )}>
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
          tone === "danger"  && "border-destructive/30 bg-destructive/5 text-destructive",
          tone === "warning" && "border-amber-300/50 bg-amber-50/50 text-amber-600 dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-400",
          tone === "muted"   && "border-border text-muted-foreground"
        )}>
          {label}
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
        <AvatarFallback className="bg-muted text-[9px] font-bold text-muted-foreground">
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
  const classes: Record<PriorityKey, { class: string; icon: any }> = {
    urgent: { class: "border-red-200 text-red-600 dark:border-red-800 dark:text-red-400", icon: AlertTriangle },
    high:   { class: "border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400", icon: TrendingUpIcon },
    normal: { class: "border-primary/25 text-primary", icon: Minus },
    low:    { class: "border-border text-muted-foreground", icon: TrendingDown },
  };
  const current = classes[priority] || classes.normal;
  const Icon = current.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
      current.class
    )}>
      <Icon size={11} className="shrink-0" />
      <span>{priority}</span>
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
  const pct = Math.round((value / Math.max(max, 1)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-medium capitalize text-foreground">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tones[label])}
          style={{ width: `${pct}%` }}
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
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger:  "text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border/70 bg-background px-3.5 py-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">{label}</p>
      <p className={cn("mt-1.5 text-[22px] font-bold tracking-[-0.03em] leading-none", valueColor)}>{value}</p>
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
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors group-hover:text-primary group-hover:border-primary/20">
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
  const styles: Record<string, { class: string; icon: any }> = {
    ceo:     { class: "text-violet-600 border-violet-200 bg-violet-50 dark:text-violet-300 dark:border-violet-800 dark:bg-violet-950/30", icon: Crown },
    admin:   { class: "text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/30", icon: Shield },
    manager: { class: "text-primary border-primary/25 bg-primary/5", icon: Briefcase },
    member:  { class: "text-muted-foreground border-border bg-muted/30", icon: User },
    viewer:  { class: "text-muted-foreground/60 border-border/60 bg-muted/20", icon: Eye },
  };
  const current = styles[role] || styles.member;
  const Icon = current.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
      current.class
    )}>
      <Icon size={11} className="shrink-0" />
      <span>{role}</span>
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
        <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
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

// ─── Velocity gauge ────────────────────────────────────────────────────────────

export function VelocityGauge({ pct, label }: { pct: number; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ * 0.75; // 3/4 arc
  const color = pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="72" height="58" viewBox="0 0 72 58">
        {/* Track */}
        <circle
          cx="36" cy="46" r={r}
          fill="none" stroke="currentColor" strokeWidth="5"
          strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          className="text-muted/60"
          transform="rotate(-225 36 46)"
        />
        {/* Fill */}
        <circle
          cx="36" cy="46" r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-225 36 46)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="36" y="43" textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="inherit">
          {pct}%
        </text>
      </svg>
      <span className="text-[11px] text-muted-foreground/60 font-medium">{label}</span>
    </div>
  );
}

// ─── Today banner ──────────────────────────────────────────────────────────────

export function TodayBanner({ overdue, dueToday }: { overdue: number; dueToday: number }) {
  if (overdue === 0 && dueToday === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 px-5 py-3.5">
        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
          You&apos;re all clear — no overdue or due-today tasks.
        </p>
      </div>
    );
  }
  return (
    <div className={cn(
      "flex items-center gap-4 rounded-2xl border px-5 py-3.5",
      overdue > 0
        ? "border-destructive/20 bg-destructive/5"
        : "border-amber-200/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20"
    )}>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-[13px] font-semibold",
          overdue > 0 ? "text-destructive" : "text-amber-700 dark:text-amber-300"
        )}>
          {overdue > 0
            ? `${overdue} overdue task${overdue > 1 ? "s" : ""} need${overdue === 1 ? "s" : ""} attention`
            : `${dueToday} task${dueToday > 1 ? "s" : ""} due today`}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground/70">
          {overdue > 0 && dueToday > 0
            ? `Plus ${dueToday} more due today`
            : overdue > 0 ? "Review and take action below" : "Stay on track — complete these today"}
        </p>
      </div>
      <Link
        href="/dashboard/my-tasks?due=overdue"
        className="shrink-0 rounded-lg border border-current px-3 py-1.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10 transition-colors"
      >
        Review →
      </Link>
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
