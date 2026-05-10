"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Settings,
  LogOut,
  User as UserIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
  Video,
  BarChart3,
  Building2,
  ShieldCheck,
  Smile,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse, Company } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresenceStore } from "@/store/presence";
import { PRESENCE_META } from "@/lib/presence";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Quick status presets
const STATUS_PRESETS: Array<{ emoji: string; text: string; clearMinutes: number | null }> = [
  { emoji: "🗓️", text: "In a meeting", clearMinutes: 60 },
  { emoji: "🤒", text: "Out sick", clearMinutes: 24 * 60 },
  { emoji: "🌴", text: "On vacation", clearMinutes: null },
  { emoji: "🏠", text: "Working remotely", clearMinutes: null },
  { emoji: "🎯", text: "Focusing — DMs only", clearMinutes: 60 },
  { emoji: "🚂", text: "Commuting", clearMinutes: 30 },
];

const NAV_MAIN = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Portfolio", href: "/portfolio", icon: BarChart3 },
  { name: "Projects",  href: "/projects",  icon: FolderKanban },
  { name: "Messages",  href: "/messages",  icon: MessageSquare },
  { name: "Calendar",  href: "/calendar",  icon: Calendar },
  { name: "Meetings",  href: "/meetings",  icon: Video },
];

const NAV_BOTTOM = [
  { name: "Settings",  href: "/settings",  icon: Settings },
];

function StatusModal({ onClose }: { onClose: () => void }) {
  const { customStatus, setCustomStatus } = usePresenceStore();
  const [emoji, setEmoji] = useState(customStatus?.emoji ?? "");
  const [text, setText] = useState(customStatus?.text ?? "");
  const [clearMinutes, setClearMinutes] = useState<number | null>(null);

  const save = () => {
    if (!text.trim() && !emoji) {
      setCustomStatus(null);
    } else {
      const clearAt = clearMinutes
        ? new Date(Date.now() + clearMinutes * 60_000).toISOString()
        : null;
      setCustomStatus({ emoji: emoji || "💬", text: text.trim() || emoji, clearAt });
    }
    onClose();
  };

  return (
    <div className="w-72 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">Set a status</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {/* Presets */}
      <div className="space-y-1">
        {STATUS_PRESETS.map((p) => (
          <button
            key={p.text}
            type="button"
            onClick={() => { setEmoji(p.emoji); setText(p.text); setClearMinutes(p.clearMinutes); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-muted/60 transition-colors text-left"
          >
            <span className="text-base">{p.emoji}</span>
            <span className="truncate">{p.text}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-border pt-2 space-y-2">
        <div className="flex gap-1.5">
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="😊"
            className="h-8 w-12 text-center text-base shrink-0 px-1"
            maxLength={4}
          />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's your status?"
            className="h-8 flex-1 text-[12px]"
            maxLength={80}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          />
        </div>
        <select
          value={clearMinutes ?? ""}
          onChange={(e) => setClearMinutes(e.target.value ? Number(e.target.value) : null)}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-[12px]"
        >
          <option value="">Don&apos;t clear</option>
          <option value="30">Clear in 30 minutes</option>
          <option value="60">Clear in 1 hour</option>
          <option value="240">Clear in 4 hours</option>
          <option value="480">Clear in 8 hours</option>
          <option value="1440">Clear today</option>
        </select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px]" onClick={() => { setCustomStatus(null); onClose(); }}>
            Clear
          </Button>
          <Button size="sm" className="flex-1 h-8 text-[12px]" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname    = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const myPresence  = usePresenceStore((s) => s.status);
  const customStatus = usePresenceStore((s) => s.customStatus);
  const setCustomStatus = usePresenceStore((s) => s.setCustomStatus);
  const initials    = (user?.full_name?.charAt(0) ?? "?").toUpperCase();

  // Auto-clear expired custom status
  if (customStatus?.clearAt && new Date(customStatus.clearAt) < new Date()) {
    setCustomStatus(null);
  }

  // Detect if user is a company CEO/admin to show Company Admin nav item.
  const { data: myCompanies } = useQuery<Company[]>({
    queryKey: ["my-companies-sidebar"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Company[]>>("/companies/");
      return res.data.data ?? [];
    },
    enabled: !!user && !user.is_superuser,
    staleTime: 60_000,
  });

  const isCompanyAdmin = !!(user?.is_superuser) ||
    (myCompanies ?? []).some(c =>
      c.your_role === "ceo" || c.your_role === "admin"
    );

  const NavLink = ({
    item,
  }: {
    item: { name: string; href: string; icon: React.ElementType };
  }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        title={collapsed ? item.name : undefined}
        className={cn("nav-item", active && "active", collapsed && "justify-center px-0 gap-0")}
      >
        <item.icon size={15} className="nav-icon" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 h-screen overflow-hidden",
        "sidebar-shell border-r",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[52px]" : "w-[216px]"
      )}
    >
      {/* ── Header: logo + collapse ── */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-[hsl(220_18%_20%)]",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 select-none">
            <span className="h-5 w-5 rounded-md bg-primary flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="3.5" height="3.5" rx="0.75" fill="white" />
                <rect x="5.5" y="1" width="3.5" height="3.5" rx="0.75" fill="white" opacity="0.7" />
                <rect x="1" y="5.5" width="3.5" height="3.5" rx="0.75" fill="white" opacity="0.7" />
                <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.75" fill="white" opacity="0.4" />
              </svg>
            </span>
            <span className="text-[13.5px] font-bold tracking-tight text-white select-none">
              flowteam
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-md",
            "text-[hsl(220_12%_62%)] hover:text-[hsl(220_14%_85%)]",
            "hover:bg-[hsl(220_18%_18%)] transition-colors",
          )}
        >
          {collapsed
            ? <PanelLeftOpen size={14} />
            : <PanelLeftClose size={14} />
          }
        </button>
      </div>

      {/* ── Workspace switcher ── */}
      <div
        className={cn(
          "shrink-0 border-b border-[hsl(220_18%_20%)]",
          collapsed ? "px-2 py-2" : "px-3 py-2.5"
        )}
      >
        <TeamSwitcher collapsed={collapsed} />
      </div>

      {/* ── Main nav ── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-3 space-y-0.5",
          collapsed ? "px-1.5" : "px-2"
        )}
      >
        {!collapsed && (
          <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(220_12%_62%)]">
            Main
          </p>
        )}
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* ── Admin section ── */}
        {(isCompanyAdmin || user?.is_superuser) && (
          <>
            {!collapsed && (
              <p className="px-2 mt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(220_12%_62%)]">
                Admin
              </p>
            )}
            {collapsed && <div className="my-1.5 border-t border-[hsl(220_18%_20%)]" />}
            {isCompanyAdmin && !user?.is_superuser && (
              <NavLink item={{ name: "Company", href: "/company-admin/dashboard", icon: Building2 }} />
            )}
            {user?.is_superuser && (
              <NavLink item={{ name: "Super Admin", href: "/super-admin/dashboard", icon: ShieldCheck }} />
            )}
          </>
        )}
      </nav>

      {/* ── Bottom nav ── */}
      <div
        className={cn(
          "shrink-0 border-t border-[hsl(220_18%_20%)] py-2 space-y-0.5",
          collapsed ? "px-1.5" : "px-2"
        )}
      >
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* ── User account ── */}
      <div
        className={cn(
          "shrink-0 border-t border-[hsl(220_18%_20%)] p-2.5"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg p-1.5 text-left",
                "hover:bg-[hsl(220_18%_18%)] transition-colors focus-visible:outline-none",
                "focus-visible:ring-1 focus-visible:ring-ring",
                collapsed && "justify-center"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-6.5 w-6.5 h-[26px] w-[26px] border border-[hsl(220_18%_20%)]">
                  <AvatarImage src={user?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px] bg-primary text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-px -right-px h-2 w-2 rounded-full border-[1.5px] border-sidebar-bg",
                    PRESENCE_META[myPresence].dotClass
                  )}
                />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[hsl(220_14%_85%)] truncate leading-tight">
                    {user?.full_name ?? "Account"}
                  </p>
                  {customStatus ? (
                    <p className="text-[10px] font-medium leading-tight mt-px text-[hsl(220_14%_65%)] truncate">
                      {customStatus.emoji} {customStatus.text}
                    </p>
                  ) : (
                    <p className={cn("text-[10px] font-medium leading-tight mt-px", PRESENCE_META[myPresence].textClass)}>
                      {PRESENCE_META[myPresence].label}
                    </p>
                  )}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuLabel className="text-[12px] font-semibold pb-1">
              {user?.full_name}
              <p className="text-[10px] font-normal text-muted-foreground mt-0.5 truncate">
                {user?.email}
              </p>
              {customStatus && (
                <p className="text-[10px] font-normal text-foreground/80 mt-0.5 truncate">
                  {customStatus.emoji} {customStatus.text}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Status setter — opens inline popover */}
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setStatusOpen(true); }}
                  className="text-[13px] gap-2"
                >
                  <Smile size={13} className="text-muted-foreground" />
                  {customStatus ? "Update status" : "Set a status"}
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" sideOffset={8} className="p-0 w-auto">
                <StatusModal onClose={() => setStatusOpen(false)} />
              </PopoverContent>
            </Popover>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="text-[13px] gap-2">
                <UserIcon size={13} className="text-muted-foreground" />
                Profile &amp; settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-[13px] gap-2 text-destructive focus:text-destructive"
            >
              <LogOut size={13} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
