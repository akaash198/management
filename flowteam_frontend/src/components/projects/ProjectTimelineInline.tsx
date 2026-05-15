"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-red-500/80",
  high: "bg-orange-500/80",
  normal: "bg-primary/70",
  low: "bg-muted-foreground/40",
};

export function ProjectTimelineInline({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useTasks({ project_id: projectId });

  const datedTasks = useMemo(() => {
    return (tasks as Task[])
      .map((t) => {
        const due = parseDate(t.due_date);
        const start = parseDate((t as any).start_date ?? null) ?? due;
        if (!start || !due) return null;
        return { task: t, start, due };
      })
      .filter(Boolean) as Array<{ task: Task; start: Date; due: Date }>;
  }, [tasks]);

  const [windowDays, setWindowDays] = useState(30);
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const range = useMemo(() => {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 3);
    const end = new Date(start);
    end.setDate(start.getDate() + windowDays);
    return { start, end };
  }, [anchor, windowDays]);

  const today = useMemo(() => {
    const startMs = range.start.getTime();
    const total = range.end.getTime() - startMs;
    const pct = (Date.now() - startMs) / total;
    return clamp(pct * 100, 0, 100);
  }, [range]);

  const items = useMemo(() => {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    const total = Math.max(1, endMs - startMs);
    return datedTasks
      .filter(({ due, start }) => due.getTime() >= startMs && start.getTime() <= endMs)
      .map(({ task, start, due }) => {
        const left = clamp((start.getTime() - startMs) / total, 0, 1);
        const right = clamp((due.getTime() - startMs) / total, 0, 1);
        const width = clamp(right - left, 0.01, 1);
        return { task, start, due, leftPct: left * 100, widthPct: width * 100 };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [datedTasks, range]);

  // Generate date column headers
  const dateHeaders = useMemo(() => {
    const headers: { label: string; pct: number }[] = [];
    const totalMs = range.end.getTime() - range.start.getTime();
    const step = windowDays <= 14 ? 1 : windowDays <= 30 ? 3 : windowDays <= 60 ? 7 : 14;
    const d = new Date(range.start);
    while (d <= range.end) {
      const pct = ((d.getTime() - range.start.getTime()) / totalMs) * 100;
      headers.push({
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pct,
      });
      d.setDate(d.getDate() + step);
    }
    return headers;
  }, [range, windowDays]);

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Timeline</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Tasks with start + due dates · {items.length} visible
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={() => setAnchor((d) => new Date(d.getTime() - 7 * 86400000))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={() => setAnchor((d) => new Date(d.getTime() + 7 * 86400000))}
          >
            Forward
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
            value={String(windowDays)}
            onChange={(e) => setWindowDays(Number(e.target.value))}
          >
            <option value="14">2 weeks</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
        {/* Date header row */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-4 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
              Task
            </div>
            <div className="col-span-8 relative h-9 overflow-hidden">
              {dateHeaders.map((h) => (
                <span
                  key={h.label}
                  className="absolute top-2 text-[10px] text-muted-foreground whitespace-nowrap"
                  style={{ left: `${h.pct}%` }}
                >
                  {h.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {items.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="font-medium">No tasks with dates in this range</p>
              <p className="mt-1 text-[12px] opacity-70">
                Add a <strong>start date</strong> and <strong>due date</strong> to tasks to see them here.
              </p>
            </div>
          ) : (
            items.map(({ task, start, due, leftPct, widthPct }) => {
              const barColor = PRIORITY_COLOR[task.priority ?? "normal"] ?? "bg-primary/70";
              const isOverdue = due < new Date() && task.status !== "done";
              return (
                <div
                  key={task.id}
                  className="grid grid-cols-12 gap-0 items-center hover:bg-muted/30 transition-colors"
                >
                  {/* Label */}
                  <div className="col-span-4 px-4 py-2.5 border-r border-border min-w-0">
                    <Link
                      href={`/projects/${projectId}?task=${task.id}`}
                      className="text-[13px] font-medium truncate hover:underline block"
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <GitBranch className="h-2.5 w-2.5" />
                        {task.issue_type ?? "task"}
                      </span>
                      <span className={cn("text-[10px]", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                        {fmt(start)} → {fmt(due)}
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="col-span-8 px-2 py-2.5">
                    <div className="relative h-7 rounded-md bg-muted/30 border border-border overflow-hidden">
                      {/* Today marker */}
                      {today > 0 && today < 100 && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-blue-500/60 z-10"
                          style={{ left: `${today}%` }}
                        />
                      )}
                      {/* Task bar */}
                      <div
                        className={cn(
                          "absolute top-1 h-5 rounded transition-all",
                          barColor,
                          isOverdue && "ring-1 ring-destructive ring-offset-0"
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${task.title} (${fmt(start)} → ${fmt(due)})`}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="sticky bottom-0 border-t border-border bg-card px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/80 inline-block" /> Critical</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500/80 inline-block" /> High</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/70 inline-block" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40 inline-block" /> Low</span>
          <span className="flex items-center gap-1.5 ml-2"><span className="h-3 w-px bg-blue-500/60 inline-block" /> Today</span>
        </div>
      </div>
    </div>
  );
}
