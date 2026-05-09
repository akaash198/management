# FlowTeam — Complete Frontend Redesign Prompt
## Premium, Professional, Dark-First UI

**How to use:** This is a single, complete prompt. Paste the entire contents into Claude (or any AI coding assistant) as your implementation brief. It is self-contained — no prior context needed.

---

## BRIEF

You are redesigning the complete frontend of **FlowTeam** — a professional team workspace SaaS that combines project management (Kanban, sprints, milestones), real-time messaging, meetings, calendar, analytics, and AI features in one product.

The redesign goal is: **premium, dark-first, Linear/Vercel/Raycast-quality UI** — precise spacing, intentional colour, confident typography, and zero visual noise. Every pixel must feel earned.

The current codebase already exists and works. You are not rebuilding from scratch — you are upgrading the visual layer. All data, hooks, API calls, and business logic stay untouched. You are only changing:
- `src/app/globals.css` — design tokens
- `src/components/layout/Sidebar.tsx` — sidebar shell
- `src/app/(app)/layout.tsx` — topbar / shell
- `src/app/(app)/dashboard/page.tsx` — dashboard page
- `src/app/(app)/projects/[id]/page.tsx` — Kanban board page
- `src/app/(app)/messages/page.tsx` — messaging page
- Individual UI component files in `src/components/ui/`
- Any shared layout or shell files

**DO NOT change:**
- Any `src/hooks/` files
- Any `src/lib/` files (api.ts, auth.ts, etc.)
- Any `src/store/` files
- Any `src/types/` files
- Any backend files
- Any API call logic inside components — only wrap it differently visually

---

## STACK CONSTRAINTS

- **Tailwind CSS v4** — use `@import "tailwindcss"` (already in globals.css). No `tailwind.config.js` needed for v4.
- **shadcn/ui (Radix)** — all base components already exist in `src/components/ui/`. Upgrade their token usage, do not replace the library.
- **CSS custom properties** — all design tokens are defined as HSL values in `:root` and `.dark` in `globals.css`. Reference them via `hsl(var(--token))` or Tailwind's `bg-background`, `text-foreground` etc.
- **lucide-react** — only icon library. Do not add others.
- **Inter** (variable font) and **Geist Mono** are loaded in `src/app/layout.tsx` — use `font-sans` and `font-mono` Tailwind classes.
- **Next.js 16 App Router** — all `(app)` pages are client components where marked `"use client"`. Keep that.
- Do not install any new npm packages.

---

## PART 1 — DESIGN TOKENS (`src/app/globals.css`)

Replace the entire `globals.css` with this new token system. The design is **dark-first** — the dark theme is the default and primary experience. Light mode is supported but secondary.

```css
@import "tailwindcss";

/* ─────────────────────────────────────────────────────
   FLOWTEAM DESIGN TOKENS v3.0
   Dark-first. Precision spacing. Zero visual noise.
   ───────────────────────────────────────────────────── */

:root {
  /* ── Surfaces ── */
  --background:        222 28% 97%;
  --foreground:        222 28% 8%;

  --card:              0 0% 100%;
  --card-foreground:   222 28% 8%;

  --popover:           0 0% 100%;
  --popover-foreground: 222 28% 8%;

  /* ── Brand — Indigo primary ── */
  --primary:           243 75% 59%;
  --primary-foreground: 0 0% 100%;
  --primary-muted:     243 75% 59% / 0.12;

  /* ── Secondary / neutral ── */
  --secondary:         220 16% 94%;
  --secondary-foreground: 222 20% 28%;

  /* ── Muted ── */
  --muted:             220 14% 93%;
  --muted-foreground:  220 10% 48%;

  /* ── Accent ── */
  --accent:            243 75% 59%;
  --accent-foreground: 0 0% 100%;

  /* ── Semantic ── */
  --destructive:       0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --success:           142 69% 34%;
  --success-foreground: 0 0% 100%;
  --warning:           38 92% 48%;
  --warning-foreground: 0 0% 100%;
  --info:              210 90% 48%;
  --info-foreground:   0 0% 100%;

  /* ── Structure ── */
  --border:            220 13% 89%;
  --border-strong:     220 13% 80%;
  --input:             220 13% 89%;
  --ring:              243 75% 59%;

  /* ── Sidebar — stays dark even in light mode ── */
  --sidebar-bg:        222 30% 10%;
  --sidebar-fg:        220 14% 58%;
  --sidebar-fg-muted:  220 12% 38%;
  --sidebar-active-bg: 243 60% 22%;
  --sidebar-active-fg: 243 100% 88%;
  --sidebar-hover-bg:  220 20% 16%;
  --sidebar-border:    220 20% 17%;

  /* ── Radius ── */
  --radius:    0.5rem;
  --radius-sm: 0.375rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.25rem;

  /* ── Shadow tokens ── */
  --shadow-xs:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04);
  --shadow-xl:  0 20px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
  --shadow-primary: 0 4px 16px rgba(99,92,246,0.25);
}

/* ─────────────────────────────────────────────────────
   DARK MODE — primary experience
   ───────────────────────────────────────────────────── */
.dark {
  /* ── Surfaces — layered depth system ── */
  --background:        222 28% 7%;       /* base canvas */
  --foreground:        214 20% 90%;

  --card:              222 24% 10%;      /* elevated surface (+1 layer) */
  --card-foreground:   214 20% 90%;

  --popover:           222 22% 12%;      /* +2 layer */
  --popover-foreground: 214 20% 90%;

  /* ── Brand ── */
  --primary:           243 78% 65%;
  --primary-foreground: 222 28% 7%;
  --primary-muted:     243 78% 65% / 0.15;

  /* ── Secondary ── */
  --secondary:         220 20% 15%;
  --secondary-foreground: 214 16% 68%;

  /* ── Muted ── */
  --muted:             220 18% 14%;
  --muted-foreground:  220 12% 48%;

  /* ── Accent ── */
  --accent:            243 78% 65%;
  --accent-foreground: 222 28% 7%;

  /* ── Semantic ── */
  --destructive:       0 65% 58%;
  --destructive-foreground: 0 0% 100%;
  --success:           142 62% 42%;
  --success-foreground: 0 0% 100%;
  --warning:           38 88% 52%;
  --warning-foreground: 222 28% 7%;
  --info:              210 85% 55%;
  --info-foreground:   222 28% 7%;

  /* ── Structure ── */
  --border:            220 18% 17%;
  --border-strong:     220 16% 24%;
  --input:             220 18% 17%;
  --ring:              243 78% 65%;

  /* ── Sidebar ── */
  --sidebar-bg:        222 32% 6%;
  --sidebar-fg:        220 14% 52%;
  --sidebar-fg-muted:  220 12% 34%;
  --sidebar-active-bg: 243 55% 20%;
  --sidebar-active-fg: 243 100% 85%;
  --sidebar-hover-bg:  220 22% 13%;
  --sidebar-border:    220 22% 13%;

  /* ── Shadows — more visible on dark ── */
  --shadow-xs:  0 1px 2px rgba(0,0,0,0.3);
  --shadow-sm:  0 1px 4px rgba(0,0,0,0.4);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.45);
  --shadow-xl:  0 20px 56px rgba(0,0,0,0.5);
  --shadow-primary: 0 4px 20px rgba(120,100,255,0.35);
}

/* ─────────────────────────────────────────────────────
   BASE STYLES
   ───────────────────────────────────────────────────── */
* { box-sizing: border-box; }

html { height: 100%; }

body {
  height: 100%;
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  line-height: 1.5;
}

/* ── Scrollbars ── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(var(--border-strong)); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }
* { scrollbar-width: thin; scrollbar-color: hsl(var(--border-strong)) transparent; }

/* ── Focus ring ── */
:focus-visible {
  outline: 2px solid hsl(var(--ring) / 0.7);
  outline-offset: 2px;
}

/* ─────────────────────────────────────────────────────
   SIDEBAR SHELL CLASSES
   ───────────────────────────────────────────────────── */
.sidebar-shell {
  background-color: hsl(var(--sidebar-bg));
  color: hsl(var(--sidebar-fg));
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--sidebar-fg));
  text-decoration: none;
  transition: background-color 120ms ease, color 120ms ease;
  line-height: 1;
}
.nav-item:hover {
  background-color: hsl(var(--sidebar-hover-bg));
  color: hsl(220 14% 85%);
}
.nav-item.active {
  background-color: hsl(var(--sidebar-active-bg));
  color: hsl(var(--sidebar-active-fg));
  font-weight: 600;
}
.nav-item .nav-icon { color: inherit; opacity: 0.75; flex-shrink: 0; }
.nav-item.active .nav-icon { opacity: 1; }

/* ─────────────────────────────────────────────────────
   CARD / SURFACE LAYERS
   ───────────────────────────────────────────────────── */
.surface-0 { background-color: hsl(var(--background)); }
.surface-1 { background-color: hsl(var(--card)); }
.surface-2 { background-color: hsl(var(--popover)); }

/* ─────────────────────────────────────────────────────
   KANBAN COLUMN
   ───────────────────────────────────────────────────── */
.kanban-column {
  background-color: hsl(var(--muted) / 0.5);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 12px;
  min-width: 272px;
  max-width: 272px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dark .kanban-column {
  background-color: hsl(220 22% 10% / 0.7);
  border-color: hsl(var(--border));
}

/* ─────────────────────────────────────────────────────
   TASK CARD
   ───────────────────────────────────────────────────── */
.task-card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 100ms ease;
}
.task-card:hover {
  border-color: hsl(var(--border-strong));
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.dark .task-card {
  background-color: hsl(222 22% 13%);
  border-color: hsl(220 18% 20%);
}
.dark .task-card:hover {
  border-color: hsl(220 18% 28%);
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}

/* ─────────────────────────────────────────────────────
   MESSAGE BUBBLE
   ───────────────────────────────────────────────────── */
.msg-bubble-own {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: 14px 14px 4px 14px;
}
.msg-bubble-other {
  background-color: hsl(var(--muted));
  color: hsl(var(--foreground));
  border-radius: 14px 14px 14px 4px;
}
.dark .msg-bubble-other {
  background-color: hsl(220 20% 16%);
}

/* ─────────────────────────────────────────────────────
   PRIORITY INDICATORS
   ───────────────────────────────────────────────────── */
.priority-urgent { color: hsl(0 72% 58%);   background: hsl(0 72% 58% / 0.12); }
.priority-high   { color: hsl(38 88% 52%);  background: hsl(38 88% 52% / 0.12); }
.priority-normal { color: hsl(210 80% 55%); background: hsl(210 80% 55% / 0.12); }
.priority-low    { color: hsl(220 12% 52%); background: hsl(220 12% 52% / 0.1); }

/* ─────────────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────────────── */
.status-todo      { color: hsl(220 12% 52%); background: hsl(220 12% 52% / 0.10); }
.status-progress  { color: hsl(243 78% 65%); background: hsl(243 78% 65% / 0.12); }
.status-review    { color: hsl(38 88% 52%);  background: hsl(38 88% 52% / 0.12); }
.status-done      { color: hsl(142 62% 42%); background: hsl(142 62% 42% / 0.12); }
.status-blocked   { color: hsl(0 72% 58%);   background: hsl(0 72% 58% / 0.12); }

/* ─────────────────────────────────────────────────────
   ANIMATIONS
   ───────────────────────────────────────────────────── */
@keyframes fade-in  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes fade-up  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes slide-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.animate-fade-in  { animation: fade-in  200ms ease forwards; }
.animate-fade-up  { animation: fade-up  250ms ease forwards; }
.animate-slide-in { animation: slide-in 200ms ease forwards; }
.animate-pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
```

---

## PART 2 — SIDEBAR (`src/components/layout/Sidebar.tsx`)

Rewrite the entire sidebar with this exact design. Keep all imports of `useAuthStore`, `TeamSwitcher`, `usePresenceStore`, `PRESENCE_META` — only change the visual output.

**Design spec:**
- Width: 220px expanded, 52px collapsed
- Background: `hsl(var(--sidebar-bg))` — always dark regardless of theme
- Top section: logo mark + wordmark + collapse button
- Workspace section: `TeamSwitcher` with a compact rounded trigger
- Navigation: two groups — Main (Dashboard, Portfolio, Projects, Messages, Calendar, Meetings) and a bottom section (Settings)
- Nav items: 36px height, 10px horizontal padding, 8px border-radius, smooth active indicator
- Active state: `hsl(var(--sidebar-active-bg))` background, left accent bar (2px, `hsl(var(--primary))`)
- User section: bottom, avatar + name + presence dot, chevron to open dropdown
- Subtle section labels ("WORKSPACE", "MAIN") in 10px uppercase tracking-widest, only when expanded

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, MessageSquare, Settings,
  LogOut, User as UserIcon, PanelLeftClose, PanelLeftOpen,
  Calendar, Video, BarChart3, ChevronsUpDown, Kanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import { useAuthStore } from "@/store/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresenceStore } from "@/store/presence";
import { PRESENCE_META } from "@/lib/presence";

const NAV_MAIN = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Portfolio",  href: "/portfolio",  icon: BarChart3 },
  { name: "Projects",   href: "/projects",   icon: FolderKanban },
  { name: "Messages",   href: "/messages",   icon: MessageSquare },
  { name: "Calendar",   href: "/calendar",   icon: Calendar },
  { name: "Meetings",   href: "/meetings",   icon: Video },
];

const NAV_BOTTOM = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname   = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const myPresence = usePresenceStore((s) => s.status);
  const initials   = (user?.full_name?.charAt(0) ?? "?").toUpperCase();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavItem = ({ item }: { item: typeof NAV_MAIN[0] }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        title={collapsed ? item.name : undefined}
        className={cn(
          "relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px]",
          "text-[13px] font-medium leading-none transition-all duration-100",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20",
          active
            ? "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))]"
            : "text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(220_14%_82%)]",
          collapsed && "justify-center px-0"
        )}
      >
        {/* Active left accent bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-[hsl(var(--primary))] opacity-90" />
        )}
        <item.icon
          size={15}
          className={cn(
            "shrink-0 transition-colors",
            active ? "opacity-100" : "opacity-60"
          )}
        />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen shrink-0 overflow-hidden",
        "sidebar-shell",
        "border-r border-[hsl(var(--sidebar-border))]",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* ── Logo + collapse ── */}
      <div className={cn(
        "flex h-[52px] shrink-0 items-center border-b border-[hsl(var(--sidebar-border))]",
        collapsed ? "justify-center" : "justify-between px-4"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 select-none">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[hsl(var(--primary))] shadow-[0_0_12px_hsl(var(--primary)/0.4)]">
              <Kanban size={13} className="text-white" />
            </div>
            <span className="text-[14px] font-bold tracking-[-0.025em] text-white/90 select-none">
              FlowTeam
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            "text-[hsl(var(--sidebar-fg-muted))] hover:text-[hsl(var(--sidebar-fg))]",
            "hover:bg-[hsl(var(--sidebar-hover-bg))] transition-all duration-100",
          )}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* ── Workspace switcher ── */}
      <div className={cn(
        "shrink-0 border-b border-[hsl(var(--sidebar-border))]",
        collapsed ? "px-2 py-2" : "px-3 py-2.5"
      )}>
        <TeamSwitcher collapsed={collapsed} />
      </div>

      {/* ── Main nav ── */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-3 space-y-0.5",
        collapsed ? "px-1.5" : "px-2.5"
      )}>
        {!collapsed && (
          <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-fg-muted))]">
            Main
          </p>
        )}
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* ── Bottom nav ── */}
      <div className={cn(
        "shrink-0 border-t border-[hsl(var(--sidebar-border))] py-2 space-y-0.5",
        collapsed ? "px-1.5" : "px-2.5"
      )}>
        {NAV_BOTTOM.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>

      {/* ── User ── */}
      <div className={cn(
        "shrink-0 border-t border-[hsl(var(--sidebar-border))] p-2.5"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-2.5 rounded-xl p-2 text-left",
              "hover:bg-[hsl(var(--sidebar-hover-bg))] transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/15",
              collapsed && "justify-center p-2"
            )}>
              <div className="relative shrink-0">
                <Avatar className="h-[28px] w-[28px] border border-white/10">
                  <AvatarImage src={user?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px] bg-[hsl(var(--primary))] text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-[2px] border-[hsl(var(--sidebar-bg))]",
                  PRESENCE_META[myPresence].dotClass
                )} />
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white/85 truncate leading-tight">
                      {user?.full_name ?? "Account"}
                    </p>
                    <p className={cn("text-[10px] font-medium leading-tight mt-px", PRESENCE_META[myPresence].textClass)}>
                      {PRESENCE_META[myPresence].label}
                    </p>
                  </div>
                  <ChevronsUpDown size={12} className="text-[hsl(var(--sidebar-fg-muted))] shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-52">
            <DropdownMenuLabel className="text-[12px] font-semibold pb-1">
              {user?.full_name}
              <p className="text-[10px] font-normal text-muted-foreground mt-0.5 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="text-[13px] gap-2">
                <UserIcon size={13} className="text-muted-foreground" />
                Profile &amp; settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-[13px] gap-2 text-destructive focus:text-destructive">
              <LogOut size={13} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
```

---

## PART 3 — APP SHELL TOPBAR (`src/app/(app)/layout.tsx`)

Redesign only the `<header>` section inside `AppLayout`. Keep all hooks, state, auth logic, and `QueryClientProvider` unchanged.

**Topbar design spec:**
- Height: 52px
- Background: `hsl(var(--card))` with a `border-b border-border`
- Very subtle bottom shadow: `shadow-[0_1px_0_hsl(var(--border))]`
- Left: breadcrumb — small, muted, with `ChevronRight` separators. Active segment in `text-foreground`. Rest in `text-muted-foreground/50`.
- Right group (gap-1):
  1. **Search button** — pill shape, `h-8`, `bg-muted/60`, has magnifier icon + "Search" text + `⌘K` kbd badge. Hover: `bg-muted`.
  2. **Notification bell** — `NotificationBell` component, 32px icon button, ghost style.
  3. **Divider** — 1px vertical line, 16px tall.
  4. **User chip** — avatar (28px) + name + role + presence dot. Opens a presence dropdown on click. Compact, no border, ghost hover.

Replace the existing header JSX block only — do not touch anything outside the `<header>` tag.

```tsx
{/* ── Topbar ── */}
<header className="h-[52px] shrink-0 z-20 flex items-center justify-between gap-4 px-5 bg-card border-b border-border shadow-[0_1px_0_hsl(var(--border)/0.5)]">

  {/* Breadcrumb */}
  <nav className="flex items-center gap-1 text-[12px] min-w-0 overflow-hidden" aria-label="Breadcrumb">
    <Link
      href="/dashboard"
      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors font-medium shrink-0"
    >
      FlowTeam
    </Link>
    {segments.map((seg, i) => {
      const isLast = i === segments.length - 1;
      const label  = PAGE_LABELS[seg] ?? (UUID_RE.test(seg) ? null : seg.replace(/-/g, " "));
      if (!label) return null;
      return (
        <span key={i} className="flex items-center gap-1 min-w-0">
          <ChevronRight size={10} className="text-muted-foreground/20 shrink-0" />
          <Link
            href={"/" + segments.slice(0, i + 1).join("/")}
            className={cn(
              "capitalize font-medium transition-colors truncate",
              isLast ? "text-foreground" : "text-muted-foreground/50 hover:text-foreground"
            )}
          >
            {label}
          </Link>
        </span>
      );
    })}
  </nav>

  {/* Right controls */}
  <div className="flex items-center gap-1 shrink-0">
    {/* Search */}
    <button
      onClick={() => setSearchOpen(true)}
      className={cn(
        "hidden md:flex items-center gap-2 h-8 pl-3 pr-2 rounded-lg",
        "bg-muted/60 border border-border/60 hover:bg-muted hover:border-border",
        "text-[12px] text-muted-foreground transition-all duration-100"
      )}
    >
      <Search size={12} className="shrink-0 opacity-60" />
      <span className="font-medium">Search</span>
      <kbd className="ml-1.5 hidden lg:flex items-center gap-0.5 rounded-md border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60 leading-none">
        ⌘K
      </kbd>
    </button>

    {/* Notifications */}
    <NotificationBell />

    {/* Divider */}
    <div className="w-px h-4 bg-border/70 mx-1" />

    {/* User + presence */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5",
          "hover:bg-muted transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        )}>
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-semibold leading-tight text-foreground">{user.full_name}</p>
            <p className="text-[10px] text-muted-foreground leading-tight capitalize mt-px">{userRole}</p>
          </div>
          <div className="relative">
            <Avatar className="h-7 w-7 border border-border/70">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-[2px] border-card",
              PRESENCE_META[myPresence].dotClass
            )} />
          </div>
        </button>
      </DropdownMenuTrigger>
      {/* presence dropdown — keep existing JSX unchanged */}
      <DropdownMenuContent align="end" sideOffset={8} className="w-52 p-1">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1.5">Set status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PRESENCE_OPTIONS.map((status) => (
          <DropdownMenuItem key={status} onClick={() => setMyPresence(status)} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]">
            <span className={cn("h-2 w-2 rounded-full shrink-0", PRESENCE_META[status].dotClass)} />
            <span className="flex-1 font-medium">{PRESENCE_META[status].label}</span>
            {myPresence === status && <Check size={12} className="text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</header>
```

---

## PART 4 — DASHBOARD PAGE (`src/app/(app)/dashboard/page.tsx`)

Redesign the dashboard visual layout. Keep all `useQuery`, API calls, and data hooks exactly as-is — only change the JSX/UI rendering.

**Layout spec:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Page header: "Good morning, {name}" + date + AI Briefing button │
├────────────┬────────────┬────────────┬────────────────────────────┤
│  Stat card │  Stat card │  Stat card │       Stat card            │
├────────────┴────────────┴────────────┴────────────────────────────┤
│  My Tasks (2/3 width)              │  Activity feed (1/3 width)  │
│  - Overdue section                 │  - Timeline of events       │
│  - Due today section               │  - compact rows             │
│  - In progress section             │                             │
├────────────────────────────────────┴─────────────────────────────┤
│  Active Sprint                     │  AI Briefing Card           │
│  - Progress bar                    │  (if AI plan)               │
│  - Sprint stats                    │                             │
└──────────────────────────────────────────────────────────────────┘
```

**Visual rules for dashboard:**

1. **Page header** — no box, no card. Just text.
   - `text-[22px] font-bold tracking-tight` for the greeting
   - `text-[13px] text-muted-foreground` for date and subtitle
   - AI Briefing button on the right: `variant="outline" size="sm"` with a Sparkles icon

2. **Stat cards** — 4-column grid. Each card:
   - `bg-card border border-border rounded-xl p-5`
   - Large number: `text-[28px] font-black tracking-[-0.04em]`
   - Label: `text-[12px] text-muted-foreground`
   - Trend chip: small pill, green for positive, red for negative
   - Subtle coloured icon in top-right: 32px, low opacity background

3. **Section headers** inside main content area:
   - `text-[13px] font-semibold text-foreground` + optional count badge
   - `mb-3 flex items-center justify-between`

4. **Task rows** in My Tasks section:
   - `flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors`
   - Priority dot (4px circle, colour-coded) on the left
   - Task title `text-[13px] font-medium`
   - Project badge: `text-[10px] font-medium bg-muted rounded-full px-2 py-0.5`
   - Due date right-aligned: `text-[11px]`, red if overdue
   - Assignee avatar: 18px, far right

5. **Activity feed** — right column:
   - Each item: avatar (20px) + event text (12px) + relative time (10px muted)
   - Subtle left border: `border-l-2 border-border pl-3 ml-2.5`
   - No card wrappers — just the list itself on the `bg-card` panel

6. **Sprint card** — show current sprint with:
   - Sprint name + status badge
   - Linear progress bar (full width, 6px height, rounded)
   - Three mini stats below: Tasks Done / In Progress / Days Left
   - `bg-card border border-border rounded-xl p-5`

**Colour coding rules to use throughout:**
- Overdue items: `text-red-500` / `bg-red-500/10`
- Due today: `text-amber-500` / `bg-amber-500/10`
- Done / success: `text-emerald-500` / `bg-emerald-500/10`
- AI features: `text-violet-400` / `bg-violet-500/10`
- Primary actions: `text-primary` / `bg-primary/10`

---

## PART 5 — KANBAN BOARD PAGE (`src/app/(app)/projects/[id]/page.tsx`)

Redesign the Kanban board page. Keep all `useColumns`, `useTasks`, DnD kit, and API logic. Only change layout and visual styling.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Project name (h1) + status badge + sprint info                 │
│  Toolbar: [View tabs] ──────── [Filter][Group by][+ Add task]   │
├─────────────────────────────────────────────────────────────────┤
│  Horizontal scroll container                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │
│  │ Column   │ │ Column   │ │ Column   │ │ Column   │ │  +   │  │
│  │ header   │ │ header   │ │ header   │ │ header   │ │ New  │  │
│  │ ─────── │ │ ─────── │ │ ─────── │ │ ─────── │ │ col  │  │
│  │ TaskCard │ │ TaskCard │ │ TaskCard │ │ TaskCard │ │      │  │
│  │ TaskCard │ │ TaskCard │ │          │ │          │ │      │  │
│  │          │ │ + Add    │ │ + Add    │ │ + Add    │ │      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Column design:**
- Width: 272px fixed. Gap between columns: 12px.
- Header: column name in `text-[13px] font-semibold`, task count badge (muted pill), options `...` menu on hover
- Column colour strip: 3px top border with the column's accent colour (derive from column order: indigo/violet/amber/emerald/rose)
- Background: `hsl(var(--muted)/0.4)` in light, `hsl(220 22% 10%/0.6)` in dark
- "+  Add task" button at the bottom of every column: ghost, small, full width

**Task card design:**
- `bg-card border border-border rounded-[10px] p-3` with hover lift (use `.task-card` class from globals.css)
- Top row: priority dot + title
- Middle: description preview (1 line, text-muted, text-[12px]) — only if description exists
- Bottom row: assignee avatar (18px) + due date pill + label chips
- If task has subtasks: show `[2/5]` completion chip
- If task has a GitHub PR linked: show a `GitBranch` icon chip
- If task is blocked: show a red `Lock` icon

**Toolbar:**
- Left: `[Board]` `[List]` `[Timeline]` view tabs — pill style, active has `bg-muted`
- Right: Filter button (outline, shows active filter count badge), Group By dropdown, separator, `+ New Task` primary button

---

## PART 6 — MESSAGES PAGE (`src/app/(app)/messages/page.tsx`)

Redesign the messaging UI. Keep all WebSocket, `useMessaging`, and channel data hooks. Only change visual layout.

**Three-panel layout (all within the messages page):**
```
┌──────────────┬────────────────────────────────┬───────────────┐
│  Channel     │  Chat area                      │  Thread panel │
│  sidebar     │                                 │  (conditonal) │
│  200px       │  flex-1                         │  300px        │
└──────────────┴────────────────────────────────┴───────────────┘
```

**Channel sidebar (left panel, 200px):**
- Section labels: "CHANNELS" and "DIRECT MESSAGES" — 10px, uppercase, tracking-wide, muted
- Channel item: `#name` with unread count badge (indigo pill), active = `bg-muted` with left accent bar
- DM item: avatar (20px) + name + presence dot + unread count
- `+ New channel` button at bottom, ghost small
- Search channels: small input at top of sidebar

**Chat area (centre):**
- Top: channel name `#alpha-dev` in `text-[15px] font-semibold` + member count + pin/search/call buttons on right
- Message list: vertically scrollable, messages grouped by day with `──── Today ────` date dividers
- Message item:
  - Avatar (28px) + sender name `text-[13px] font-semibold` + timestamp `text-[11px] text-muted-foreground`
  - Message body: `text-[14px] leading-[1.6]`
  - Hover reveals: reaction picker + reply + pin + more actions (appearing as a floating action bar above the message, not inline)
  - Own messages: right-aligned, `msg-bubble-own` class
  - Replies/threads: show reply count chip `💬 3 replies` — click opens thread panel
- Input area (bottom):
  - Full-width rounded input box: `rounded-xl border border-border bg-muted/50 px-4 py-3`
  - Left toolbar: `+` attach, emoji, mention `@`
  - Right: send button (primary, icon only, appears when input has text)

**Thread panel (right, 300px, conditionally shown):**
- Header: "Thread" + `×` close
- Shows original message + all replies
- Reply input at bottom
- Separator from main content: `border-l border-border`

---

## PART 7 — SHARED UI COMPONENTS

### `src/components/ui/button.tsx`
The button is already well-structured with CVA variants. Make these targeted upgrades:

1. Default `default` variant: add `shadow-[var(--shadow-primary)]` for the indigo glow
2. All variants: change base `rounded-lg` to `rounded-[8px]` for more precision
3. Add a new `brand` variant:
```ts
brand: [
  "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground",
  "shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,var(--shadow-primary)]",
  "hover:from-primary/95 hover:to-primary/80 active:scale-[0.98]",
].join(" "),
```
4. Add `"active:scale-[0.98] transition-transform"` to the base class for press feedback.

### `src/components/ui/card.tsx`
Update card to use the new surface system:
```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground",
        "shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    />
  )
)
```

### `src/components/ui/badge.tsx`
Replace fixed colour strings with semantic variants:
```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-primary/12 text-primary border border-primary/20",
        secondary:   "bg-secondary text-secondary-foreground border border-border",
        destructive: "bg-destructive/12 text-destructive border border-destructive/20",
        success:     "bg-success/12 text-success border border-success/20",
        warning:     "bg-warning/12 text-warning border border-warning/20",
        outline:     "border border-border text-muted-foreground bg-transparent",
        ghost:       "bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### `src/components/ui/input.tsx`
```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2",
        "text-[13px] text-foreground placeholder:text-muted-foreground/50",
        "transition-all duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring",
        "hover:border-border-strong",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
```

### `src/components/ui/select.tsx`
Ensure the `SelectTrigger` uses the same `h-9 rounded-lg border-input` spec as the Input above for visual consistency across all form controls.

---

## PART 8 — TYPOGRAPHY SYSTEM

In `globals.css`, add these typography utility classes to use consistently across the app:

```css
/* ── Typography scale ── */
.text-page-title   { font-size: 20px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.25; }
.text-section-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.text-card-title   { font-size: 13px; font-weight: 600; }
.text-label        { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: hsl(var(--muted-foreground)); }
.text-body         { font-size: 13px; line-height: 1.6; }
.text-body-sm      { font-size: 12px; line-height: 1.55; }
.text-caption      { font-size: 11px; color: hsl(var(--muted-foreground)); }
.text-code         { font-family: var(--font-mono), ui-monospace, monospace; font-size: 12px; }
```

---

## PART 9 — LOADING & EMPTY STATES

### Loading skeletons
Every data-loading state should use `src/components/ui/skeleton.tsx`. Add this to globals.css:

```css
/* Skeleton shimmer */
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground)/0.08) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% auto;
  animation: shimmer 1.8s linear infinite;
}
```

### Empty states
Every empty list should use this consistent pattern:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 border border-border">
    <{RelevantIcon} size={22} className="text-muted-foreground/50" />
  </div>
  <p className="text-[14px] font-semibold text-foreground">{title}</p>
  <p className="mt-1.5 text-[13px] text-muted-foreground max-w-[260px] leading-relaxed">{description}</p>
  {cta && <Button variant="outline" size="sm" className="mt-5">{cta}</Button>}
</div>
```

---

## PART 10 — DARK MODE ACTIVATION

The app currently has CSS tokens for dark mode but may not be activating them. Ensure the following:

1. In `src/app/layout.tsx`, add `className="dark"` to the `<html>` tag by default (dark-first strategy):
```tsx
<html lang="en" className={`${inter.variable} ${geistMono.variable} h-full dark`} suppressHydrationWarning>
```

2. If a light/dark toggle exists in settings, it should add/remove the `dark` class on `document.documentElement` and persist the preference to `localStorage` under key `"flowteam-theme"`.

3. On app load, read `localStorage.getItem("flowteam-theme")` and apply the class before first render to prevent flash.

---

## DESIGN PRINCIPLES — Follow these for every component

**1. Depth through layering, not shadows**
Use background colour steps (`--background` → `--card` → `--popover`) to create depth. In dark mode these are `#0d1117` → `#161b22` → `#1c2128` (GitHub-style). Reserve shadows for floating elements (dropdowns, modals, tooltips) only.

**2. Borders are your grid**
Every card, panel, and section should be separated by `border-border` (1px, `hsl(220 18% 17%)` in dark). Avoid using padding or background changes alone — a border makes the boundary crisp and professional.

**3. Micro-interactions on every interactive element**
- Buttons: `active:scale-[0.98]`
- Cards: `hover:border-border-strong hover:shadow-md`
- Nav items: `transition-all duration-100`
- Inputs: `hover:border-border-strong focus:ring`
These must be present. They are what makes the UI feel alive.

**4. Typography is the most important design decision**
- Page titles: 20px bold, `tracking-tight`
- Section headers: 13px semibold
- Body text: 13px, line-height 1.6
- Labels/captions: 11px, muted
- Monospace (code, IDs): `font-mono`, 12px
Never use `text-base` (16px) for UI text — it's too large for dense information apps.

**5. Colour carries meaning, not decoration**
- Indigo: primary actions, links, active states
- Emerald: success, done, positive
- Amber: warnings, due today, at-risk
- Red: errors, overdue, destructive
- Violet: AI features exclusively
- Cyan: meetings, calendar, real-time
- White/grey: everything structural

**6. Whitespace is expensive — use it deliberately**
- Between sections: `py-6` (not `py-12`)
- Inside cards: `p-5`
- Between list items: `gap-1` or `space-y-1` (not `space-y-4`)
- Page horizontal padding: `px-6`
- Max content width: `max-w-screen-xl` for full-width pages, `max-w-5xl` for form/settings pages

**7. Every list needs a header and an empty state**
No bare lists. Every section has: a labelled header with count, the list, and an empty state if the list is empty.

**8. Icons are functional, not decorative**
Only use icons when they carry meaning (navigation, status, action). Icon size: 14px for inline, 16px for buttons, 18px for section icons. Never use icons over 20px in body content.

---

## WHAT GOOD LOOKS LIKE

Reference these products for visual inspiration:
- **Linear** — precision spacing, dark sidebar, task density
- **Vercel Dashboard** — surface layering, stat cards, clean tables
- **Raycast** — typography scale, command palette, micro-interactions  
- **Liveblocks** — dark-first docs/app hybrid
- **GitHub (dark)** — border-based depth, dense information, code typography

The goal is: a developer opens FlowTeam and immediately thinks "this was built by people who care about quality." Not flashy. Not over-designed. Just precise.

---

*Generated: 2026-05-02 | FlowTeam v2.2 | Reference codebase: d:\management\flowteam_frontend*
