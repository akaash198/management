"use client";

import React from "react";
import { 
  LayoutDashboard, 
  List, 
  Layers, 
  RotateCcw, 
  Bug,
  GanttChartSquare,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectViewType = "board" | "list" | "epics" | "retrospectives" | "bugs" | "timeline";

interface ProjectTabsProps {
  activeView: ProjectViewType;
  onViewChange: (view: ProjectViewType) => void;
  tasksCount?: number;
}

export function ProjectTabs({ activeView, onViewChange, tasksCount }: ProjectTabsProps) {
  const tabs = [
    { id: "board" as const, label: "Board", icon: LayoutDashboard },
    { id: "list" as const, label: "Table", icon: List },
    { id: "epics" as const, label: "Epics", icon: Layers },
    { id: "timeline" as const, label: "Timeline", icon: GanttChartSquare },
    { id: "bugs" as const, label: "Bugs", icon: Bug },
    { id: "retrospectives" as const, label: "Retrospectives", icon: RotateCcw },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card/50 px-6 backdrop-blur-sm sticky top-0 z-10">
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all relative",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon size={16} className={cn(isActive ? "text-primary" : "text-muted-foreground/70")} />
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--primary),0.3)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
