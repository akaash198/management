"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Settings,
  LogOut,
  User as UserIcon,
  Calendar,
  Video,
  BarChart3,
  Building2,
  ShieldCheck,
  Smile,
  X,
  ChevronsUpDown,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";

/* ── Quick status presets ── */
const STATUS_PRESETS = [
  { emoji: "🗓️", text: "In a meeting",      clearMinutes: 60 },
  { emoji: "🤒", text: "Out sick",           clearMinutes: 24 * 60 },
  { emoji: "🌴", text: "On vacation",        clearMinutes: null },
  { emoji: "🏠", text: "Working remotely",   clearMinutes: null },
  { emoji: "🎯", text: "Focusing — DMs only", clearMinutes: 60 },
  { emoji: "🚂", text: "Commuting",          clearMinutes: 30 },
] as const;

/* ── Navigation definitions ── */
const NAV_MAIN = [
  { name: "Dashboard", href: "/dashboard",  icon: LayoutDashboard },
  { name: "Portfolio",  href: "/portfolio",  icon: BarChart3 },
  { name: "Projects",   href: "/projects",   icon: FolderKanban },
  { name: "Messages",   href: "/messages",   icon: MessageSquare },
  { name: "Calendar",   href: "/calendar",   icon: Calendar },
  { name: "Meetings",   href: "/meetings",   icon: Video },
];

/* ═══════════════════════════════════════════
   STATUS MODAL
   ═══════════════════════════════════════════ */
function StatusModal({ onClose }: { onClose: () => void }) {
  const { customStatus, setCustomStatus } = usePresenceStore();
  const [emoji, setEmoji]               = useState(customStatus?.emoji ?? "");
  const [text, setText]                 = useState(customStatus?.text ?? "");
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
    <div className="w-72 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-tight">Set a status</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-0.5">
        {STATUS_PRESETS.map((p) => (
          <button
            key={p.text}
            type="button"
            onClick={() => { setEmoji(p.emoji); setText(p.text); setClearMinutes(p.clearMinutes); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-muted/70 transition-colors text-left"
          >
            <span className="text-base leading-none">{p.emoji}</span>
            <span className="truncate text-foreground/80">{p.text}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex gap-1.5">
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value)}
            placeholder="😊" className="h-8 w-12 text-center text-base shrink-0 px-1" maxLength={4} />
          <Input value={text} onChange={(e) => setText(e.target.value)}
            placeholder="What's your status?" className="h-8 flex-1 text-[12px]" maxLength={80}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        </div>
        <select value={clearMinutes ?? ""}
          onChange={(e) => setClearMinutes(e.target.value ? Number(e.target.value) : null)}
          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground">
          <option value="">Don&apos;t clear</option>
          <option value="30">Clear in 30 minutes</option>
          <option value="60">Clear in 1 hour</option>
          <option value="240">Clear in 4 hours</option>
          <option value="480">Clear in 8 hours</option>
          <option value="1440">Clear today</option>
        </select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px]"
            onClick={() => { setCustomStatus(null); onClose(); }}>Clear</Button>
          <Button size="sm" className="flex-1 h-8 text-[12px]" onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RAIL ICON BUTTON w/ flyout tooltip
   ═══════════════════════════════════════════ */
function RailItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>
        <Link
          href={href}
          aria-label={label}
          onClick={onNavigate}
          className={cn("rail-item", active && "active")}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
          {badge != null && badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1 leading-none">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          sideOffset={12}
          className="rail-radix-tooltip"
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-popover" width={8} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR — Icon rail
   ═══════════════════════════════════════════ */
export function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname      = usePathname();
  const [statusOpen, setStatusOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const myPresence    = usePresenceStore((s) => s.status);
  const customStatus  = usePresenceStore((s) => s.customStatus);
  const setCustomStatus = usePresenceStore((s) => s.setCustomStatus);
  const initials      = (user?.full_name?.charAt(0) ?? "?").toUpperCase();

  // Auto-clear expired custom status
  if (customStatus?.clearAt && new Date(customStatus.clearAt) < new Date()) {
    setCustomStatus(null);
  }

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
    (myCompanies ?? []).some((c) => c.your_role === "ceo" || c.your_role === "admin");

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={100}>
    <aside
      className={cn(
        "flex flex-col shrink-0 h-screen overflow-hidden",
        "rail-shell border-r w-[56px]",
      )}
      style={{ borderRightColor: "hsl(var(--rail-border))" }}
    >
      {/* ── Logo mark ── */}
      <div className="flex h-[56px] shrink-0 items-center justify-center border-b relative" style={{ borderColor: "hsl(var(--rail-border))" }}>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-primary text-primary-foreground font-black text-[14px] tracking-tighter"
        >
          CW
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Close navigation"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* ── Team switcher (icon-only) ── */}
      <div className="shrink-0 flex items-center justify-center py-2 border-b" style={{ borderColor: "hsl(var(--rail-border))" }}>
        <TeamSwitcher collapsed={true} />
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-3">
        {NAV_MAIN.map((item) => (
          <RailItem
            key={item.href}
            href={item.href}
            label={item.name}
            icon={item.icon}
            active={isActive(item.href)}
            onNavigate={onClose}
          />
        ))}

        {/* Admin section */}
        {(isCompanyAdmin || user?.is_superuser) && (
          <>
            <div className="w-7 border-t my-1" style={{ borderColor: "hsl(var(--rail-border))" }} />
            {isCompanyAdmin && !user?.is_superuser && (
              <RailItem href="/company-admin/dashboard" label="Company" icon={Building2} active={isActive("/company-admin/dashboard")} onNavigate={onClose} />
            )}
            {user?.is_superuser && (
              <RailItem href="/super-admin/dashboard" label="Super Admin" icon={ShieldCheck} active={isActive("/super-admin/dashboard")} onNavigate={onClose} />
            )}
          </>
        )}
      </nav>

      {/* ── Bottom: settings + user ── */}
      <div className="shrink-0 flex flex-col items-center gap-1 pb-3 border-t pt-2" style={{ borderColor: "hsl(var(--rail-border))" }}>
        <RailItem href="/settings" label="Settings" icon={Settings} active={isActive("/settings")} onNavigate={onClose} />

        {/* User avatar dropdown */}
        <DropdownMenu>
          <TooltipPrimitive.Root delayDuration={300}>
          <TooltipPrimitive.Trigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="rail-item relative focus-visible:outline-none"
              aria-label="Account menu"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 border-2" style={{ borderColor: "hsl(var(--rail-border))" }}>
                  <AvatarImage src={user?.avatar_url || ""} />
                  <AvatarFallback className="text-[11px] font-bold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2",
                    PRESENCE_META[myPresence].dotClass
                  )}
                  style={{ borderColor: "hsl(var(--rail-bg))" }}
                />
              </div>
            </button>
          </DropdownMenuTrigger>
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content side="right" sideOffset={12} className="rail-radix-tooltip">
              <span className="font-semibold">{user?.full_name ?? "Account"}</span>
              {customStatus && (
                <span className="block text-[10px] opacity-70 mt-0.5">{customStatus.emoji} {customStatus.text}</span>
              )}
              <TooltipPrimitive.Arrow className="fill-[hsl(224_28%_14%)]" width={8} height={5} />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
          </TooltipPrimitive.Root>

          <DropdownMenuContent side="right" align="end" sideOffset={12} className="w-58 min-w-[220px]">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2.5 py-0.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user?.avatar_url || ""} />
                  <AvatarFallback className="text-[11px] font-bold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">{user?.email}</p>
                  {customStatus && (
                    <p className="text-[11px] text-foreground/70 leading-tight truncate mt-0.5">
                      {customStatus.emoji} {customStatus.text}
                    </p>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

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
    </TooltipPrimitive.Provider>
  );
}
