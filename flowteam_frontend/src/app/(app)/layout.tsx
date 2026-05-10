"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/store/auth";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Search, ChevronRight, Check } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchModal } from "@/components/search/SearchModal";
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

/* ── Page label map ── */
const PAGE_LABELS: Record<string, string> = {
  dashboard:   "Dashboard",
  projects:    "Projects",
  issues:      "Issues",
  planning:    "Planning",
  operations:  "Operations",
  messages:    "Messages",
  settings:    "Settings",
  calendar:    "Calendar",
  permissions: "Permissions",
  reports:     "Reports",
  audit:       "Audit Log",
  "super-admin": "Admin",
  "company-admin": "Company Admin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, fetchMe, isLoading } = useAuthStore();
  const router    = useRouter();
  const pathname  = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const { teams, activeTeamId }     = useTeamStore();
  const [queryClient]               = useState(() => new QueryClient());
  const [didInit, setDidInit]       = useState(false);
  const myPresence    = usePresenceStore((s) => s.status);
  const setMyPresence = usePresenceStore((s) => s.setStatus);

  useEffect(() => { fetchMe().finally(() => setDidInit(true)); }, [fetchMe]);

  useEffect(() => {
    if (didInit && !isLoading && !user) router.push("/login");
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
        <Loader2 className="animate-spin h-5 w-5 text-primary opacity-60" />
      </div>
    );
  }
  if (!user) return null;

  const segments  = pathname.split("/").filter(Boolean);
  const userRole  = user.is_superuser
    ? "Super admin"
    : (teams.find((t) => t.id === activeTeamId)?.your_role ?? "Member");
  const initials  = (user.full_name?.charAt(0) ?? "?").toUpperCase();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* ── Topbar ── */}
          <header className="h-[52px] shrink-0 z-20 flex items-center justify-between gap-4 px-5 bg-card border-b border-border">

            {/* Breadcrumb */}
            <nav
              className="flex items-center gap-1 text-[12.5px] min-w-0 overflow-hidden"
              aria-label="Breadcrumb"
            >
              <Link
                href="/dashboard"
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors font-medium shrink-0"
              >
                flowteam
              </Link>
              {segments.map((seg, i) => {
                const isLast = i === segments.length - 1;
                const label  = PAGE_LABELS[seg]
                  ?? (UUID_RE.test(seg) ? null : seg.replace(/-/g, " "));
                if (!label) return null;
                return (
                  <span key={i} className="flex items-center gap-1 min-w-0">
                    <ChevronRight size={10} className="text-muted-foreground/25 shrink-0" />
                    <Link
                      href={"/" + segments.slice(0, i + 1).join("/")}
                      className={cn(
                        "capitalize font-medium transition-colors truncate",
                        isLast
                          ? "text-foreground"
                          : "text-muted-foreground/60 hover:text-foreground"
                      )}
                    >
                      {label}
                    </Link>
                  </span>
                );
              })}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 shrink-0">

              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "hidden md:flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg",
                  "bg-muted/50 border border-border/70 hover:bg-muted hover:border-border",
                  "text-[12px] text-muted-foreground transition-all duration-150"
                )}
              >
                <Search size={12} className="shrink-0" />
                <span className="font-medium">Search</span>
                <kbd className="ml-1 flex items-center gap-0.5 text-[10px] bg-background border border-border/60 rounded px-1.5 py-0.5 font-mono leading-none text-muted-foreground/70">
                  Ctrl+K
                </kbd>
              </button>

              {/* Notifications */}
              <NotificationBell />

              <div className="w-px h-4 bg-border mx-0.5" />

              {/* User + presence */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1",
                      "hover:bg-muted transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    )}
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-[12px] font-semibold leading-tight text-foreground">
                        {user.full_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight capitalize mt-px">
                        {userRole}
                      </p>
                    </div>
                    <div className="relative">
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-card",
                          PRESENCE_META[myPresence].dotClass
                        )}
                      />
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={8} className="w-52 p-1">
                  <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1.5">
                    Set status
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRESENCE_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setMyPresence(status)}
                      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          PRESENCE_META[status].dotClass
                        )}
                      />
                      <span className="flex-1 font-medium">{PRESENCE_META[status].label}</span>
                      {myPresence === status && (
                        <Check size={12} className="text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </QueryClientProvider>
  );
}
