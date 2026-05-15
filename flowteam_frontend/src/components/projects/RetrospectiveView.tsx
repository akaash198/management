"use client";

import React, { useState } from "react";
import { useRetrospectives } from "@/hooks/useRetrospectives";
import type { RetroItem } from "@/types/task";
import {
  Plus,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Calendar,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RetrospectiveViewProps {
  teamId: string;
}

export const RetrospectiveView: React.FC<RetrospectiveViewProps> = ({ teamId }) => {
  const { retrospectives, loading, createRetrospective, addRetroItem, voteRetroItem } =
    useRetrospectives(teamId);

  const [activeRetroId, setActiveRetroId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemType, setNewItemType] = useState<RetroItem["item_type"]>("keep");
  const [addingItem, setAddingItem] = useState(false);

  // Create retro dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const activeRetro = retrospectives.find((r) => r.id === activeRetroId);

  const handleCreateRetro = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const newRetro = await createRetrospective({
        team: teamId,
        title: newTitle.trim(),
        date: new Date().toISOString().split("T")[0],
      });
      if (newRetro) setActiveRetroId(newRetro.id);
      setNewTitle("");
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleAddItem = async () => {
    if (!activeRetroId || !newItemText.trim()) return;
    setAddingItem(true);
    try {
      await addRetroItem({
        retrospective: activeRetroId,
        item_type: newItemType,
        text: newItemText.trim(),
      });
      setNewItemText("");
    } finally {
      setAddingItem(false);
    }
  };

  if (loading && retrospectives.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Create Retro Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Retrospective</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Session title</label>
              <Input
                placeholder="e.g. Sprint 12 Retro"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateRetro()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreateRetro()} disabled={!newTitle.trim() || creating}>
                {creating ? "Starting…" : "Start session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-full bg-background">
        {/* Sidebar */}
        <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Retrospectives</h3>
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={() => setCreateOpen(true)}
              title="Start new retrospective"
            >
              <Plus size={14} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {retrospectives.length === 0 && (
              <p className="px-3 py-4 text-[12px] text-muted-foreground text-center">
                No sessions yet. Start your first retrospective.
              </p>
            )}
            {retrospectives.map((retro) => (
              <button
                key={retro.id}
                onClick={() => setActiveRetroId(retro.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border text-[13px] ${
                  activeRetroId === retro.id
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-transparent text-foreground hover:bg-muted"
                }`}
              >
                <div className="font-medium truncate">{retro.title}</div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                  <Calendar size={10} />
                  {format(new Date(retro.date), "MMM d, yyyy")}
                  <span className="mx-1">·</span>
                  <MessageSquare size={10} />
                  {retro.items?.length ?? 0} items
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
          {activeRetro ? (
            <>
              {/* Header */}
              <div className="shrink-0 border-b border-border bg-card px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold text-foreground">{activeRetro.title}</h2>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {format(new Date(activeRetro.date), "MMMM d, yyyy")} ·{" "}
                      {activeRetro.items?.length ?? 0} items
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    In Session
                  </span>
                </div>
              </div>

              {/* Columns */}
              <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-3 gap-5 h-full">
                  <RetroColumn
                    title="What went well?"
                    type="keep"
                    icon={<TrendingUp size={15} className="text-emerald-500" />}
                    accentClass="border-emerald-200 dark:border-emerald-800"
                    headerClass="bg-emerald-50 dark:bg-emerald-950/30"
                    items={activeRetro.items?.filter((i) => i.item_type === "keep") ?? []}
                    onVote={(id) => void voteRetroItem(id)}
                  />
                  <RetroColumn
                    title="What can we improve?"
                    type="improve"
                    icon={<TrendingDown size={15} className="text-rose-500" />}
                    accentClass="border-rose-200 dark:border-rose-800"
                    headerClass="bg-rose-50 dark:bg-rose-950/30"
                    items={activeRetro.items?.filter((i) => i.item_type === "improve") ?? []}
                    onVote={(id) => void voteRetroItem(id)}
                  />
                  <RetroColumn
                    title="Points for discussion"
                    type="discussion"
                    icon={<HelpCircle size={15} className="text-amber-500" />}
                    accentClass="border-amber-200 dark:border-amber-800"
                    headerClass="bg-amber-50 dark:bg-amber-950/30"
                    items={activeRetro.items?.filter((i) => i.item_type === "discussion") ?? []}
                    onVote={(id) => void voteRetroItem(id)}
                  />
                </div>
              </div>

              {/* Input bar */}
              <div className="shrink-0 border-t border-border bg-card px-6 py-4">
                <div className="flex gap-3 max-w-3xl mx-auto">
                  {/* Type selector */}
                  <div className="flex rounded-lg border border-border bg-muted p-0.5 gap-0.5">
                    <TypeButton
                      active={newItemType === "keep"}
                      onClick={() => setNewItemType("keep")}
                      label="Keep"
                      activeClass="bg-emerald-600 text-white"
                      inactiveClass="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    />
                    <TypeButton
                      active={newItemType === "improve"}
                      onClick={() => setNewItemType("improve")}
                      label="Improve"
                      activeClass="bg-rose-600 text-white"
                      inactiveClass="text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    />
                    <TypeButton
                      active={newItemType === "discussion"}
                      onClick={() => setNewItemType("discussion")}
                      label="Discuss"
                      activeClass="bg-amber-600 text-white"
                      inactiveClass="text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    />
                  </div>

                  <div className="relative flex-1">
                    <Input
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder={`Add a "${newItemType}" item…`}
                      onKeyDown={(e) => e.key === "Enter" && void handleAddItem()}
                      className="pr-10"
                    />
                    {newItemText && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setNewItemText("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={() => void handleAddItem()}
                    disabled={!newItemText.trim() || addingItem}
                    className="gap-1.5 shrink-0"
                  >
                    <Plus size={14} />
                    Add
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-12">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare size={28} className="opacity-40" />
              </div>
              <div className="text-center">
                <h3 className="text-[15px] font-semibold text-foreground">No active session</h3>
                <p className="text-[13px] mt-1 opacity-70">
                  Select a retrospective from the sidebar or start a new one.
                </p>
              </div>
              <Button
                className="gap-2 mt-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={15} />
                Start Retrospective
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const RetroColumn: React.FC<{
  title: string;
  type: string;
  icon: React.ReactNode;
  accentClass: string;
  headerClass: string;
  items: RetroItem[];
  onVote: (id: string) => void;
}> = ({ title, icon, accentClass, headerClass, items, onVote }) => (
  <div className={`flex flex-col rounded-xl border bg-card overflow-hidden ${accentClass}`}>
    {/* Column header */}
    <div className={`flex items-center gap-2 px-4 py-3 border-b ${accentClass} ${headerClass}`}>
      {icon}
      <h4 className="text-[13px] font-semibold text-foreground flex-1">{title}</h4>
      <span className="text-[11px] font-bold bg-background/60 text-muted-foreground rounded-full px-2 py-0.5">
        {items.length}
      </span>
    </div>

    {/* Items */}
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
      {items.length === 0 && (
        <p className="text-[12px] text-muted-foreground text-center py-6 opacity-60">
          No items yet. Add one below.
        </p>
      )}
      {[...items]
        .sort((a, b) => b.vote_count - a.vote_count)
        .map((item) => (
          <div
            key={item.id}
            className="bg-background rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-[13px] text-foreground leading-relaxed">{item.text}</p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                  {item.submitter?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {item.submitter?.full_name ?? "Team member"}
                </span>
              </div>
              <button
                onClick={() => onVote(item.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                  item.has_voted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <ThumbsUp size={11} className={item.has_voted ? "fill-current" : ""} />
                {item.vote_count}
              </button>
            </div>
          </div>
        ))}
    </div>
  </div>
);

const TypeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  activeClass: string;
  inactiveClass: string;
}> = ({ active, onClick, label, activeClass, inactiveClass }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${
      active ? activeClass : inactiveClass
    }`}
  >
    {label}
  </button>
);
