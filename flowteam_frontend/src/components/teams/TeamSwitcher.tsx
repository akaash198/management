"use client";

import { useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamStore } from "@/store/team";

interface TeamSwitcherProps {
  collapsed?: boolean;
}

export function TeamSwitcher({ collapsed }: TeamSwitcherProps) {
  const { teams, activeTeamId, setActiveTeamId, fetchTeams } = useTeamStore();
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const initial = (activeTeam?.name?.charAt(0) ?? "T").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch workspace"
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5",
            "text-left transition-colors duration-150",
            "hover:bg-[hsl(220_18%_18%)]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
            collapsed && "justify-center px-0"
          )}
        >
          {/* Workspace avatar */}
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              "bg-primary text-primary-foreground",
              "text-[10px] font-bold leading-none select-none shadow-sm"
            )}
          >
            {initial}
          </span>

          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[hsl(220_14%_85%)] leading-tight">
                  {activeTeam?.name ?? "Select workspace"}
                </span>
                <span className="block text-[10px] text-[hsl(220_10%_42%)] leading-tight mt-0.5">
                  Free plan
                </span>
              </span>
              <ChevronsUpDown
                size={12}
                className="shrink-0 text-[hsl(220_10%_42%)] opacity-60"
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? "right" : "bottom"}
        align="start"
        sideOffset={8}
        className="w-60 p-1"
      >
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Workspaces
        </p>

        {teams.map((team) => {
          const isActive = team.id === activeTeamId;
          return (
            <DropdownMenuItem
              key={team.id}
              onSelect={() => setActiveTeamId(team.id)}
              className="flex items-center gap-2.5 rounded-md px-2 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold shadow-sm">
                {team.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-[13px] font-medium">{team.name}</span>
              {isActive && <Check size={13} className="shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem className="flex items-center gap-2.5 rounded-md px-2 py-2 text-muted-foreground">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
            <Plus size={12} />
          </span>
          <span className="text-[13px] font-medium">Create workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
