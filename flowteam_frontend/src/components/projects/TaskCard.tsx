"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Task } from "@/types/task";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMoveTask } from "@/hooks/useTasks";
import type { Column } from "@/types/project";

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  columns?: Column[];
  projectId?: string;
}

const priorityConfig = {
  urgent: { border: "border-l-destructive", badge: "bg-destructive/10 text-destructive" },
  high: { border: "border-l-warning", badge: "bg-warning/10 text-warning" },
  normal: { border: "border-l-info", badge: "bg-info/10 text-info" },
  low: { border: "border-l-muted-foreground/30", badge: "bg-muted/50 text-muted-foreground" },
};

export function TaskCard({ task, isOverlay, columns }: TaskCardProps) {
  const router = useRouter();
  const moveTask = useMoveTask();
  const [completing, setCompleting] = useState(false);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-card-action]")) return;
    e.stopPropagation();
    router.push(`?task=${task.id}`, { scroll: false });
  };

  const doneColumn = columns?.find((col) => col.is_done_column) ?? null;
  const isInDoneColumn = doneColumn ? task.column === doneColumn.id : false;
  const otherColumns = columns?.filter((col) => col.id !== task.column && !col.is_done_column) ?? [];

  const handleQuickComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!doneColumn || completing) return;
    setCompleting(true);
    try {
      await moveTask.mutateAsync({ id: task.id, columnId: doneColumn.id, order: 0 });
    } catch {
      /* toast handled by hook */
    } finally {
      setCompleting(false);
    }
  };

  const handleMoveToColumn = async (columnId: string) => {
    setMovingTo(columnId);
    try {
      await moveTask.mutateAsync({ id: task.id, columnId, order: 0 });
    } catch {
      /* toast handled by hook */
    } finally {
      setMovingTo(null);
    }
  };

  const config = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.normal;
  const dueDate = task.due_date;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group outline-none",
        isOverlay && "scale-105 z-50"
      )}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <Card className={cn(
        "border-0.5 border-border bg-card transition-all duration-150 hover:border-primary/30 rounded-md overflow-hidden",
        "border-l-[3px]", 
        config.border,
        isInDoneColumn && "opacity-70"
      )}>
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-medium leading-tight text-foreground line-clamp-2">
              {task.title}
            </h4>
            <div data-card-action className="flex items-center gap-1 shrink-0">
              {doneColumn && !isOverlay && (
                <button
                  data-card-action
                  onClick={handleQuickComplete}
                  disabled={completing}
                  title={isInDoneColumn ? "Already completed" : "Mark complete"}
                  className={cn(
                    "h-6 w-6 rounded flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
                    completing ? "opacity-100" : "",
                    isInDoneColumn ? "text-success" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  )}
                >
                  {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} />}
                </button>
              )}
              {columns && columns.length > 1 && !isOverlay && (
                <div data-card-action className="relative inline-block">
                  <button
                    data-card-action
                    onClick={(e) => {
                      e.stopPropagation();
                      const menu = e.currentTarget.nextElementSibling as HTMLElement;
                      if (menu) {
                        menu.classList.toggle("hidden");
                      }
                    }}
                    className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    title="Move to column"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className="hidden absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg py-1 text-[12px]">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move to</div>
                    {otherColumns.map((col) => (
                      <button
                        key={col.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleMoveToColumn(col.id);
                        }}
                        disabled={movingTo === col.id}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted/50 text-foreground disabled:opacity-50 flex items-center gap-2"
                      >
                        {movingTo === col.id ? <Loader2 size={10} className="animate-spin" /> : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color || undefined }} />}
                        {col.name}
                      </button>
                    ))}
                    {otherColumns.length === 0 && (
                      <div className="px-3 py-1.5 text-muted-foreground italic">No other columns</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[11px] font-medium border-0 px-2 h-5 rounded-sm capitalize", config.badge)}>
                {task.priority}
              </Badge>
              
              {dueDate && (
                <div className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  task.is_overdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <span>{new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              {task.subtasks_count > 0 && (
                <div className="flex items-center gap-0.5 text-[10px]">
                  <CheckSquare size={12} />
                  <span>{task.subtasks_count}</span>
                </div>
              )}
              {((task.assignees && task.assignees.length > 0) || task.assignee) && (
                <div className="flex -space-x-1">
                  {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                    .slice(0, 3)
                    .map((a) => (
                      <div
                        key={a.id}
                        title={a.full_name}
                        className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border border-border"
                      >
                        {a.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
