"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { useTeamPermissions } from "@/hooks/usePermissions";
import api from "@/lib/api";
import { DashboardData } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Clock,
  TrendingUp,
  Briefcase,
  ChevronRight,
  Activity,
  ArrowUpRight,
  BarChart3,
  Gauge,
  CalendarDays,
  Zap,
  ArrowRight,
  Sparkles,
  Plus,
  RefreshCcw,
  BookmarkPlus,
  Filter,
  FolderPlus,
  ListTodo,
  CalendarRange,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ApiResponse, TeamMember } from "@/types";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AIGate } from "@/components/ai/AIGate";
import { DailyBriefingCard } from "@/components/ai/DailyBriefingCard";
import { FocusCard } from "@/components/ai/FocusCard";
import { CEODashboard } from "@/components/dashboard/CEODashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { ViewerDashboard } from "@/components/dashboard/ViewerDashboard";
import { DashboardSkeleton } from "@/components/dashboard/shared";

type DashboardTask = DashboardData["my_tasks"]["recent"][number];
type DashboardProject = DashboardData["projects"]["items"][number];
type QuickLinkProject = DashboardData["quick_links"][number];
type DashboardActivity = DashboardData["activity"][number];
type PriorityKey = keyof DashboardData["my_tasks"]["by_priority"];
type TaskFilterState = "all" | "overdue" | "today" | "upcoming";
type SavedView = {
  id: string;
  name: string;
  priority: string;
  projectId: string;
  taskState: TaskFilterState;
  search: string;
};
type SavedViewMap = Record<string, SavedView[]>;

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"] as PriorityKey[];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { activeTeamId, fetchTeams, isLoading: isTeamsLoading } = useTeamStore();
  const { role, isCEO, isAdmin, isManager, isMember } = useTeamPermissions();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (user?.is_superuser) router.replace("/super-admin/dashboard");
  }, [user?.is_superuser, router]);

  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardData>>("/dashboard/", {
        params: { team_id: activeTeamId },
      });
      return res.data.data;
    },
    enabled: !!activeTeamId,
  });

  const { data: members } = useQuery<TeamMember[]>({
    queryKey: ["members", activeTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return res.data.data;
    },
    enabled: !!activeTeamId,
  });

  if (isTeamsLoading || isLoading || !activeTeamId || !data) return <DashboardSkeleton />;

  const sharedProps = {
    data,
    members,
    activeTeamId,
    onRefresh: () => void refetch(),
    isFetching,
  };

  // Route to role-specific dashboard
  if (isCEO) return <CEODashboard {...sharedProps} />;
  if (isAdmin) return <AdminDashboard {...sharedProps} />;
  if (isManager) return <ManagerDashboard {...sharedProps} />;
  if (isMember) return <MemberDashboard {...sharedProps} />;

  // Viewer (or unknown role)
  return <ViewerDashboard data={data} members={members} activeTeamId={activeTeamId} />;
}
