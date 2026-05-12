"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Smile,
  BarChart3,
  Clock,
  UserPlus,
  Zap,
  HelpCircle,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: LucideIcon;
  example: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/poll", label: "Poll", description: "Create a quick team poll", icon: BarChart3, example: "/poll Question | Option 1 | Option 2" },
  { command: "/remind", label: "Remind", description: "Set a reminder for yourself or channel", icon: Clock, example: "/remind 15m Follow up with client" },
  { command: "/shrug", label: "Shrug", description: "Append ¯\\_(ツ)_/¯ to your message", icon: Smile, example: "/shrug it works on my machine" },
  { command: "/giphy", label: "Giphy", description: "Search and share a GIF", icon: Zap, example: "/giphy celebration" },
  { command: "/assign", label: "Assign", description: "Assign a task to someone", icon: UserPlus, example: "/assign @user Fix the login bug" },
  { command: "/status", label: "Status", description: "Set your custom status", icon: MessageCircle, example: "/status 🌴 On vacation" },
  { command: "/help", label: "Help", description: "Show available slash commands", icon: HelpCircle, example: "/help" },
];

interface SlashCommandMenuProps {
  input: string;
  visible: boolean;
  selectedIndex: number;
  onSelect: (command: string) => void;
  className?: string;
}

export function SlashCommandMenu({ input, visible, selectedIndex, onSelect, className }: SlashCommandMenuProps) {
  const filtered = useMemo(() => {
    if (!visible || !input.startsWith("/")) return [];
    const typed = input.split(" ")[0].toLowerCase();
    if (typed === "/") return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(typed));
  }, [input, visible]);

  if (!filtered.length) return null;

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      <div className="border-b border-border/60 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
          Slash Commands
        </p>
      </div>
      <div className="max-h-[260px] overflow-y-auto py-1">
        {filtered.map((cmd, i) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.command}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                i === selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-foreground"
              )}
              onClick={() => onSelect(cmd.command)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  i === selectedIndex ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground"
                )}
              >
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold">{cmd.command}</span>
                  <span className="text-[11px] text-muted-foreground">{cmd.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 truncate">{cmd.description}</p>
              </div>
              <span className="hidden sm:block shrink-0 text-[10px] text-muted-foreground/50 font-mono truncate max-w-[160px]">
                {cmd.example}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { SLASH_COMMANDS };
export type { SlashCommand };
