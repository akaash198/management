"use client";

import { useState } from "react";
import {
  AlertCircle, ChevronDown, ChevronRight, Loader2, RotateCcw,
  Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AIOutputWrapper } from "./AIOutputWrapper";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIAction {
  key: string;
  label: string;
  description?: string;
  run: () => Promise<{ result: unknown; logId?: string | null }>;
  renderResult: (result: unknown) => React.ReactNode;
  confirmBeforeApply?: boolean;
  onApply?: (result: unknown) => void | Promise<void>;
  applyLabel?: string;
}

interface AIAssistPanelProps {
  title?: string;
  actions: AIAction[];
  className?: string;
  defaultOpen?: boolean;
}

interface ActionState {
  status: "idle" | "loading" | "done" | "error";
  result: unknown;
  logId?: string | null;
  error?: string;
  confirming?: boolean;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function AIAssistPanel({ title = "AI Assist", actions, className, defaultOpen = false }: AIAssistPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [states, setStates] = useState<Record<string, ActionState>>({});

  function setActionState(key: string, update: Partial<ActionState>) {
    setStates(prev => ({ ...prev, [key]: { ...(prev[key] ?? { status: "idle", result: null }), ...update } }));
  }

  async function runAction(action: AIAction) {
    setActionState(action.key, { status: "loading", result: null, error: undefined, confirming: false });
    try {
      const { result, logId } = await action.run();
      setActionState(action.key, { status: "done", result, logId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI request failed.";
      // extract API error message if present
      const apiMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionState(action.key, { status: "error", result: null, error: apiMsg ?? msg });
    }
  }

  async function applyAction(action: AIAction, result: unknown) {
    if (action.confirmBeforeApply) {
      setActionState(action.key, { confirming: true });
      return;
    }
    await doApply(action, result);
  }

  async function doApply(action: AIAction, result: unknown) {
    if (action.onApply) await action.onApply(result);
    setActionState(action.key, { confirming: false });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors",
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {title}
        <ChevronRight className="h-3 w-3 opacity-60" />
      </button>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border border-primary/15 bg-gradient-to-b from-primary/[0.03] to-background shadow-sm",
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">AI</Badge>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="divide-y divide-border">
        {actions.map(action => {
          const state = states[action.key] ?? { status: "idle", result: null };
          return (
            <ActionBlock
              key={action.key}
              action={action}
              state={state}
              onRun={() => runAction(action)}
              onApply={() => applyAction(action, state.result)}
              onConfirm={() => doApply(action, state.result)}
              onCancelConfirm={() => setActionState(action.key, { confirming: false })}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Individual action block ───────────────────────────────────────────────────

function ActionBlock({
  action,
  state,
  onRun,
  onApply,
  onConfirm,
  onCancelConfirm,
}: {
  action: AIAction;
  state: ActionState;
  onRun: () => void;
  onApply: () => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="p-4">
      {/* Action header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{action.label}</p>
          {action.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state.status === "done" && (
            <button
              type="button"
              onClick={onRun}
              className="text-muted-foreground hover:text-foreground"
              title="Regenerate"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          {state.status !== "loading" && (
            <Button
              size="sm"
              variant={state.status === "done" ? "outline" : "default"}
              onClick={onRun}
              className="h-7 text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              {state.status === "done" ? "Redo" : "Run"}
            </Button>
          )}
          {state.status === "loading" && (
            <Button size="sm" disabled className="h-7 text-xs gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running…
            </Button>
          )}
        </div>
      </div>

      {/* Result */}
      {state.status === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{state.error}</p>
        </div>
      )}

      {state.status === "done" && state.result != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Result</p>
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-muted-foreground hover:text-foreground"
            >
              {expanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>

          {expanded && (
            <AIOutputWrapper logId={state.logId} compact>
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm">
                {action.renderResult(state.result)}
              </div>

              {/* Confirm gate */}
              {state.confirming ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Review before applying
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={onCancelConfirm} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={onConfirm} className="h-7 text-xs">
                      {action.applyLabel ?? "Apply"}
                    </Button>
                  </div>
                </div>
              ) : action.onApply ? (
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={onApply} className="h-7 text-xs gap-1">
                    {action.applyLabel ?? "Apply"}
                  </Button>
                </div>
              ) : null}
            </AIOutputWrapper>
          )}
        </div>
      )}
    </div>
  );
}
