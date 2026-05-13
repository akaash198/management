"use client";

import { 
  CheckCircle2, 
  Send, 
  X, 
  ClipboardList, 
  User, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";

interface TaskCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onConfirmComplete: () => void;
  onSendForReview: () => void;
  isProcessing: boolean;
  hasReviewColumn: boolean;
}

export function TaskCompletionModal({ 
  open, 
  onOpenChange, 
  task, 
  onConfirmComplete, 
  onSendForReview,
  isProcessing,
  hasReviewColumn
}: TaskCompletionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden glass-panel border-none page-enter shadow-lg">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/50">
          <DialogTitle className="text-page-title flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Complete Task
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground mt-1">Please verify the task details before proceeding</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Task Info Summary */}
          <div className="rounded-xl border border-border/50 bg-background/40 p-4 space-y-4">
            <div>
              <h4 className="text-[15px] font-semibold text-foreground leading-snug">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border/50">
                  {task.assignee?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "UN"}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Assignee</span>
                  <span className="text-[12px] font-medium">{task.assignee?.full_name || "Unassigned"}</span>
                </div>
              </div>

              {task.due_date && (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Due Date</span>
                    <span className={cn(
                      "text-[12px] font-medium",
                      task.is_overdue ? "text-red-500" : "text-foreground"
                    )}>
                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warning for Review Column if missing */}
          {!hasReviewColumn && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 leading-normal">
                No dedicated Review column was found in this project. "Send for Review" will move the task to the next available column instead.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[12px] font-medium text-muted-foreground px-1">Choose an action:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 bg-background/40 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                onClick={onConfirmComplete}
                disabled={isProcessing}
              >
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={18} />
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-semibold">Mark Complete</div>
                  <div className="text-[10px] text-muted-foreground">Move to Done column</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 bg-background/40 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                onClick={onSendForReview}
                disabled={isProcessing}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Send size={18} />
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-semibold">Send for Review</div>
                  <div className="text-[10px] text-muted-foreground">Request feedback</div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border/50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
