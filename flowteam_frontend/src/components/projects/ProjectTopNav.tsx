"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BarChart3, FileText, FolderOpen, GanttChartSquare, Receipt, Shield } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = {
  href: (projectId: string) => string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string, projectId: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: (id) => `/projects/${id}`,
    label: "Board",
    icon: ArrowLeft,
    match: (p, id) => p === `/projects/${id}`,
  },
  {
    href: (id) => `/projects/${id}/reports`,
    label: "Reports",
    icon: BarChart3,
    match: (p, id) => p.startsWith(`/projects/${id}/reports`),
  },
  {
    href: (id) => `/projects/${id}/docs`,
    label: "Docs",
    icon: FileText,
    match: (p, id) => p.startsWith(`/projects/${id}/docs`),
  },
  {
    href: (id) => `/projects/${id}/files`,
    label: "Files",
    icon: FolderOpen,
    match: (p, id) => p.startsWith(`/projects/${id}/files`),
  },
  {
    href: (id) => `/projects/${id}/timeline`,
    label: "Timeline",
    icon: GanttChartSquare,
    match: (p, id) => p.startsWith(`/projects/${id}/timeline`),
  },
  {
    href: (id) => `/projects/${id}/billing`,
    label: "Billing",
    icon: Receipt,
    match: (p, id) => p.startsWith(`/projects/${id}/billing`),
  },
  {
    href: (id) => `/projects/${id}/settings/permissions`,
    label: "Permissions",
    icon: Shield,
    match: (p, id) => p.startsWith(`/projects/${id}/settings/permissions`),
  },
];

export function ProjectTopNav({ projectId }: { projectId: string }) {
  const pathname = usePathname() || "";
  const { data: project } = useProject(projectId);

  return (
    <div className="border-b border-border bg-background">
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
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
            <p className="text-[12px] text-muted-foreground/70 mt-1">Project navigation</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {NAV.map((item) => {
              const active = item.match(pathname, projectId);
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-8 px-2 text-[12px]", active && "bg-muted")}
                >
                  <Link href={item.href(projectId)}>
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
