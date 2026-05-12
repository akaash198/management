"use client";

import { Inbox, MessagesSquare, Pencil, CheckCircle2 } from "lucide-react";
import { SidebarViewType } from "@/types/messaging";
import { Button } from "@/components/ui/button";

interface SpecialViewsProps {
  view: SidebarViewType;
  onRefreshChannels?: () => void;
}

export function SpecialViews({ view, onRefreshChannels }: SpecialViewsProps) {
  const content = {
    unreads: {
      icon: <Inbox size={32} className="text-indigo-400" />,
      title: "All Unreads",
      description: "You're all caught up! When you have new messages across any channel, they'll appear here for quick review.",
      action: "Mark all as read"
    },
    threads: {
      icon: <MessagesSquare size={32} className="text-indigo-400" />,
      title: "Threads",
      description: "Threads help you follow specific conversations without cluttering the main channel. Active threads will appear here.",
      action: null
    },
    drafts: {
      icon: <Pencil size={32} className="text-indigo-400" />,
      title: "Drafts & Sent",
      description: "Messages you've started but haven't sent, or messages you've recently sent across all your workspaces.",
      action: null
    },
    all: {
      icon: null,
      title: "",
      description: "",
      action: null
    }
  }[view];

  if (view === "all") return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
          {content.icon}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{content.title}</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            {content.description}
          </p>
        </div>

        {content.action && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              className="gap-2 border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-400 transition-all"
              onClick={() => onRefreshChannels?.()}
            >
              <CheckCircle2 size={16} />
              {content.action}
            </Button>
          </div>
        )}
        
        <div className="pt-8 grid grid-cols-1 gap-3">
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 opacity-50 select-none">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Coming next</p>
                <p className="text-[13px] text-muted-foreground">Unified message stream for {content.title.toLowerCase()}</p>
            </div>
        </div>
      </div>
    </div>
  );
}
