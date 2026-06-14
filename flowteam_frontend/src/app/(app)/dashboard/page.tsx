"use client";

import { Component, Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { useTeamPermissions } from "@/hooks/usePermissions";
import { useWebSocket } from "@/hooks/useWebSocket";
import api from "@/lib/api";
import { DashboardData } from "@/types/dashboard";
import type { ApiResponse, TeamMember } from "@/types";
import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/dashboard/shared";
import { toast } from "sonner";

// Role-specific dashboards are large and mutually exclusive — load only the one needed
const CEODashboard = dynamic(
  () => import("@/components/dashboard/CEODashboard").then((m) => ({ default: m.CEODashboard })),
  { loading: () => <DashboardSkeleton /> }
);
const AdminDashboard = dynamic(
  () => import("@/components/dashboard/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
  { loading: () => <DashboardSkeleton /> }
);
const ManagerDashboard = dynamic(
  () => import("@/components/dashboard/ManagerDashboard").then((m) => ({ default: m.ManagerDashboard })),
  { loading: () => <DashboardSkeleton /> }
);
const MemberDashboard = dynamic(
  () => import("@/components/dashboard/MemberDashboard").then((m) => ({ default: m.MemberDashboard })),
  { loading: () => <DashboardSkeleton /> }
);
const ViewerDashboard = dynamic(
  () => import("@/components/dashboard/ViewerDashboard").then((m) => ({ default: m.ViewerDashboard })),
  { loading: () => <DashboardSkeleton /> }
);


export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardRouteBoundary>
        <DashboardInner />
      </DashboardRouteBoundary>
    </Suspense>
  );
}

class DashboardRouteBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Dashboard render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-[1400px] space-y-4 p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <p className="text-sm font-semibold">Dashboard had trouble rendering.</p>
            <p className="mt-1 text-sm opacity-80">Try refreshing. If the issue persists, open Projects or Messages from the menu while we load a safe fallback.</p>
          </div>
          <DashboardSkeleton />
        </div>
      );
    }

    return this.props.children;
  }
}

function DashboardInner() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeTeamId, fetchTeams, isLoading: isTeamsLoading } = useTeamStore();
  const { isCEO, isAdmin, isManager, isMember } = useTeamPermissions();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    // Show one-time success message after sending invites from elsewhere.
    const qp = searchParams.get("invite_sent");
    if (qp) {
      const email = qp === "1" ? "" : qp;
      toast.success(email ? `Invitation sent to ${email}` : "Invitation sent");
      const next = new URLSearchParams(searchParams.toString());
      next.delete("invite_sent");
      router.replace(next.toString() ? `/dashboard?${next.toString()}` : "/dashboard");
      return;
    }

    try {
      const raw = sessionStorage.getItem("cowrk_invite_sent");
      if (!raw) return;
      sessionStorage.removeItem("cowrk_invite_sent");
      const parsed = JSON.parse(raw) as { email?: string } | null;
      const email = (parsed?.email || "").trim();
      toast.success(email ? `Invitation sent to ${email}` : "Invitation sent");
    } catch { /* ignore */ }
  }, [router, searchParams]);

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

  // Realtime activity updates
  const wsUrl = useMemo(() => {
    if (typeof window === "undefined" || !activeTeamId) return "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
    return `${protocol}//${host}/ws/activity/${activeTeamId}/`;
  }, [activeTeamId]);

  useWebSocket(wsUrl, {
    onMessage: (msg) => {
      if (msg.type === "activity.new") {
        const newActivity = msg.data;
        queryClient.setQueryData<DashboardData>(["dashboard", activeTeamId], (old) => {
          if (!old) return old;
          // Prepend new activity and keep only recent items
          return {
            ...old,
            activity: [newActivity, ...(old.activity || [])].slice(0, 50),
          };
        });
      }
    },
    shouldReconnect: true,
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
