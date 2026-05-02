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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import { useAuthStore } from "@/store/auth";
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

export function Sidebar() {
  const pathname    = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const myPresence  = usePresenceStore((s) => s.status);
  const initials    = (user?.full_name?.charAt(0) ?? "?").toUpperCase();

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
                  <p className={cn("text-[10px] font-medium leading-tight mt-px", PRESENCE_META[myPresence].textClass)}>
                    {PRESENCE_META[myPresence].label}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-52"
          >
            <DropdownMenuLabel className="text-[12px] font-semibold pb-1">
              {user?.full_name}
              <p className="text-[10px] font-normal text-muted-foreground mt-0.5 truncate">
                {user?.email}
              </p>
            </DropdownMenuLabel>
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
