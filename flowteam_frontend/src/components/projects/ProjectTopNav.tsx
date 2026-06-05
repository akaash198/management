"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, FileText, FlaskConical, FolderOpen, GanttChartSquare, Kanban, Megaphone, Receipt, Shield, Zap } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useProjectPermissions, type Capability } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = {
  href: (projectId: string) => string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string, projectId: string) => boolean;
  requiredAnyCaps?: Capability[];
};

const NAV: NavItem[] = [
  {
    href: (id) => `/projects/${id}`,
    label: "Board",
    icon: Kanban,
    match: (p, id) => p === `/projects/${id}`,
    requiredAnyCaps: ["can_view"],
  },
  {
    href: (id) => `/projects/${id}/reports`,
    label: "Reports",
    icon: BarChart3,
    match: (p, id) => p.startsWith(`/projects/${id}/reports`),
    requiredAnyCaps: ["can_view"],
  },
  {
    href: (id) => `/projects/${id}/docs`,
    label: "Docs",
    icon: FileText,
    match: (p, id) => p.startsWith(`/projects/${id}/docs`),
    requiredAnyCaps: ["can_view"],
  },
  {
    href: (id) => `/projects/${id}/files`,
    label: "Files",
    icon: FolderOpen,
    match: (p, id) => p.startsWith(`/projects/${id}/files`),
    requiredAnyCaps: ["can_view"],
  },
  {
    href: (id) => `/projects/${id}/timeline`,
    label: "Timeline",
    icon: GanttChartSquare,
    match: (p, id) => p.startsWith(`/projects/${id}/timeline`),
    requiredAnyCaps: ["can_view"],
  },
  {
    href: (id) => `/projects/${id}/billing`,
    label: "Billing",
    icon: Receipt,
    match: (p, id) => p.startsWith(`/projects/${id}/billing`),
    requiredAnyCaps: ["can_manage_project"],
  },
  {
    href: (id) => `/projects/${id}/settings/permissions`,
    label: "Permissions",
    icon: Shield,
    match: (p, id) => p.startsWith(`/projects/${id}/settings/permissions`),
    requiredAnyCaps: ["can_manage_members", "can_manage_project"],
  },
  {
    href: (id) => `/projects/${id}/settings/ml-experiment`,
    label: "ML Setup",
    icon: FlaskConical,
    match: (p, id) => p.startsWith(`/projects/${id}/settings/ml-experiment`),
    requiredAnyCaps: ["can_manage_project"],
  },
  {
    href: (id) => `/projects/${id}/settings/automations`,
    label: "Automations",
    icon: Zap,
    match: (p, id) => p.startsWith(`/projects/${id}/settings/automations`),
    requiredAnyCaps: ["can_manage_project"],
  },
  {
    href: (id) => `/projects/${id}/settings/experiment-broadcast`,
    label: "Broadcast",
    icon: Megaphone,
    match: (p, id) => p.startsWith(`/projects/${id}/settings/experiment-broadcast`),
    requiredAnyCaps: ["can_manage_project"],
  },
];

export function ProjectTopNav({ projectId }: { projectId: string | string[] | undefined }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const normalizedProjectId =
    typeof projectId === "string" ? projectId : Array.isArray(projectId) ? projectId[0] ?? "" : "";
  const { data: project } = useProject(normalizedProjectId);
  const roleForPerms = project ? (project.my_role ?? "viewer") : null;
  const projectPerms = useProjectPermissions(roleForPerms);

  if (!normalizedProjectId) return null;

  const visibleNav = NAV.filter((item) => {
    if (!item.requiredAnyCaps?.length) return true;
    return item.requiredAnyCaps.some((cap) => projectPerms.can(cap));
  });

  const activeIdx = visibleNav.findIndex((item) => item.match(pathname, normalizedProjectId));
  const prevItem = activeIdx > 0 ? visibleNav[activeIdx - 1] : null;
  const nextItem = activeIdx >= 0 && activeIdx < visibleNav.length - 1 ? visibleNav[activeIdx + 1] : null;

  return (
    <div className="border-b border-border bg-background">
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Left: back + project title */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href="/projects" aria-label="Back to projects">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-[18px] font-semibold tracking-tight truncate">{project?.name ?? "Project"}</h1>
              {project?.status && (
                <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
                  {project.status}
                </Badge>
              )}
            </div>
            {/* Breadcrumb hint */}
            <p className="hidden sm:block text-[11px] text-muted-foreground/50 mt-0.5 pl-10">
              All projects &rsaquo; {project?.name ?? "Project"}{activeIdx >= 0 ? ` › ${visibleNav[activeIdx].label}` : ""}
            </p>
          </div>

          {/* Right: section tabs + prev/next */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {visibleNav.map((item) => {
                const active = item.match(pathname, normalizedProjectId);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    asChild
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("h-8 px-2 text-[12px]", active && "bg-muted")}
                  >
                    <Link href={item.href(normalizedProjectId)}>
                      <Icon className="mr-1.5 h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>

            {/* Prev / Next arrows */}
            <div className="flex items-center gap-0.5 border-l border-border pl-2 ml-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!prevItem}
                onClick={() => prevItem && router.push(prevItem.href(normalizedProjectId))}
                aria-label={prevItem ? `Go to ${prevItem.label}` : "No previous section"}
                title={prevItem ? `Previous: ${prevItem.label}` : undefined}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!nextItem}
                onClick={() => nextItem && router.push(nextItem.href(normalizedProjectId))}
                aria-label={nextItem ? `Go to ${nextItem.label}` : "No next section"}
                title={nextItem ? `Next: ${nextItem.label}` : undefined}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
