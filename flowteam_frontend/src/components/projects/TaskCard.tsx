"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
}

const priorityConfig = {
  urgent: { border: "border-l-[#EF4444]", badge: "bg-[#FEE2E2] text-[#991B1B]" },
  high: { border: "border-l-[#F97316]", badge: "bg-[#FEF3C7] text-[#92400E]" },
  normal: { border: "border-l-[#3B82F6]", badge: "bg-[#EFF6FF] text-[#1E40AF]" },
  low: { border: "border-l-[#94A3B8]", badge: "bg-[#F1F5F9] text-[#475569]" },
};

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const router = useRouter();
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
    e.stopPropagation();
    router.push(`?task=${task.id}`, { scroll: false });
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
        config.border
      )}>
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-medium leading-tight text-foreground line-clamp-2">
              {task.title}
            </h4>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
               <MoreHorizontal size={14} className="text-muted-foreground" />
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
