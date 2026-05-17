"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/store/auth";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Search, ChevronRight, Check, Menu } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";

// SearchModal is only opened on Cmd+K — no need to load it upfront
const SearchModal = dynamic(
  () => import("@/components/search/SearchModal").then((m) => ({ default: m.SearchModal }))
);
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/store/team";
import Link from "next/link";
import { usePresenceStore } from "@/store/presence";
import { PRESENCE_META, PRESENCE_OPTIONS } from "@/lib/presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useThemeStore, initTheme } from "@/store/theme";

/* ── Page label map ── */
const PAGE_LABELS: Record<string, string> = {
  dashboard:       "Dashboard",
  portfolio:       "Portfolio",
  projects:        "Projects",
  issues:          "Issues",
  planning:        "Planning",
  operations:      "Operations",
  messages:        "Messages",
  settings:        "Settings",
  calendar:        "Calendar",
  meetings:        "Meetings",
  permissions:     "Permissions",
  reports:         "Reports",
  timeline:        "Timeline",
  docs:            "Docs",
  files:           "Files",
  billing:         "Billing",
  audit:           "Audit Log",
  "my-tasks":      "My Tasks",
  "super-admin":   "Super Admin",
  "company-admin": "Company Admin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, fetchMe, isLoading } = useAuthStore();
  const router    = useRouter();
  const pathname  = usePathname();
  const [searchOpen, setSearchOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { teams, activeTeamId }       = useTeamStore();
  const [queryClient]                 = useState(() => new QueryClient());
  const [didInit, setDidInit]         = useState(false);
  const myPresence    = usePresenceStore((s) => s.status);
  const setMyPresence = usePresenceStore((s) => s.setStatus);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    initTheme(theme);
  }, []);

  useEffect(() => { 
    fetchMe().then(() => {
      console.log("[AppLayout] fetchMe complete");
    }).catch(err => {
      console.error("[AppLayout] fetchMe failed:", err);
      window.alert("Dashboard Auth Failed: " + (err.response?.data?.error || err.message));
    }).finally(() => setDidInit(true)); 
  }, [fetchMe]);
  useEffect(() => {
    if (didInit && !isLoading && !user) {
      console.warn("[AppLayout] No user found after init, but NOT redirecting (DEBUG MODE)");
    }
  }, [didInit, isLoading, user, router]);

  usePushNotifications(!!user);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading || !didInit) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin h-5 w-5 text-primary opacity-50" />
      </div>
    );
  }
  if (!user) return null;

  const segments = pathname.split("/").filter(Boolean);
  const initials = (user.full_name?.charAt(0) ?? "?").toUpperCase();

  // Build breadcrumb segments, skip UUIDs
  const crumbs = segments
    .map((seg, i) => ({
      label: PAGE_LABELS[seg] ?? (UUID_RE.test(seg) ? null : seg.replace(/-/g, " ")),
      href: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
    }))
    .filter((c) => c.label !== null) as { label: string; href: string; isLast: boolean }[];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:translate-x-0 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* ══════════════════════════════════════════════
              TOPBAR — clean, editorial
              ══════════════════════════════════════════════ */}
          <header
            className="h-[56px] shrink-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 border-b backdrop-blur-md"
            style={{
              background: "hsl(var(--topbar-bg))",
              borderColor: "hsl(var(--topbar-border))",
            }}
          >
            {/* ── Mobile hamburger ── */}
            <button
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            {/* ── Breadcrumb ── */}
            <nav className="hidden sm:flex items-center gap-1.5 text-[12.5px] min-w-0 overflow-hidden" aria-label="Breadcrumb">
              <Link
                href="/dashboard"
                className="font-semibold text-muted-foreground/40 hover:text-muted-foreground transition-colors tracking-tight shrink-0 select-none"
              >
                cowrk
              </Link>
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight size={11} className="text-muted-foreground/25 shrink-0" strokeWidth={2.5} />
                  <Link
                    href={crumb.href}
                    className={cn(
                      "capitalize font-medium transition-colors truncate",
                      crumb.isLast
                        ? "text-foreground"
                        : "text-muted-foreground/55 hover:text-foreground"
                    )}
                  >
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>

            {/* ── Right controls ── */}
            <div className="flex items-center gap-1.5 shrink-0">

              {/* Search pill */}
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "hidden md:flex items-center gap-2 h-8 pl-3 pr-2 rounded-lg",
                  "bg-muted/60 border border-border hover:bg-muted hover:border-border-strong",
                  "text-[12px] text-muted-foreground transition-all duration-150 group"
                )}
              >
                <Search size={12} className="shrink-0 opacity-60 group-hover:opacity-90" />
                <span className="font-medium pr-1">Search</span>
                <kbd className="flex items-center gap-0.5 text-[10px] bg-card border border-border rounded-md px-1.5 py-0.5 font-mono leading-none text-muted-foreground/60">
                  ⌘K
                </kbd>
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Divider */}
              <div className="w-px h-5 bg-border mx-0.5" />

              {/* Presence + user */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 h-9",
                      "hover:bg-muted/70 border border-transparent hover:border-border",
                      "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-6 w-6 border border-border/60">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-px -right-px h-2 w-2 rounded-full border-2 border-card",
                          PRESENCE_META[myPresence].dotClass
                        )}
                      />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-[12.5px] font-semibold leading-tight text-foreground tracking-tight">
                        {user.full_name}
                      </p>
                      <p className={cn("text-[10px] leading-tight capitalize mt-px font-medium", PRESENCE_META[myPresence].textClass)}>
                        {PRESENCE_META[myPresence].label}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={8} className="w-52 p-1">
                  <DropdownMenuLabel className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                    Presence
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRESENCE_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setMyPresence(status)}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] cursor-pointer"
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", PRESENCE_META[status].dotClass)} />
                      <span className="flex-1 font-medium">{PRESENCE_META[status].label}</span>
                      {myPresence === status && (
                        <Check size={11} className="text-primary shrink-0" strokeWidth={2.5} />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden page-enter bg-dot-pattern">
            {children}
          </main>
        </div>
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </QueryClientProvider>
  );
}
