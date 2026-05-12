"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AuditLog } from "@/types/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Shield,
  Download,
  AlertTriangle,
  LogIn,
  LogOut,
  Mail,
  FileDown,
  User,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/store/team";
import Link from "next/link";

const ACTION_META: Record<string, { icon: typeof LogIn; colors: string }> = {
  create: { icon: LogIn, colors: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  update: { icon: LogIn, colors: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  delete: { icon: AlertTriangle, colors: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  login: { icon: LogIn, colors: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  logout: { icon: LogOut, colors: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  permission_change: { icon: Shield, colors: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  invite_sent: { icon: Mail, colors: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  export: { icon: FileDown, colors: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Shield, colors: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ model: "", action: "" });
  const [search, setSearch] = useState("");
  const { activeTeamId, fetchTeams } = useTeamStore();

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const { data, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit", activeTeamId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ team_id: activeTeamId ?? "", ...filters });
      const res = await api.get(`/audit/audit/?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!activeTeamId,
  });

  const logs = (data ?? []).filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.object_repr.toLowerCase().includes(q) ||
      log.model_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.actor?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-[22px] font-medium tracking-tight">Security Audit Log</h1>
            </div>
            <p className="text-[13px] text-muted-foreground/70 mt-0.5">
              Track all sensitive actions and administrative changes.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Log
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search activity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              value={filters.model}
              onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
            >
              <option value="">All Models</option>
              <option value="Task">Tasks</option>
              <option value="Project">Projects</option>
              <option value="Team">Team</option>
              <option value="User">Users</option>
            </select>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="invite_sent">Invite Sent</option>
              <option value="permission_change">Permission Change</option>
              <option value="export">Export</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground font-medium shrink-0">
            {logs.length} event{logs.length !== 1 ? "s" : ""}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => <LogSkeleton key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const meta = getActionMeta(log.action);
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground line-clamp-1">
                              {log.object_repr}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                              {log.model_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
                              {log.actor?.avatar ? (
                                <img src={log.actor.avatar} className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {log.actor?.full_name || "System"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1.5 rounded-full px-2.5 py-0.5 font-bold uppercase text-[9px]",
                              meta.colors
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                            {log.ip_address || "0.0.0.0"}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-right">
                            <span className="text-xs font-semibold text-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {format(new Date(log.created_at), "MMM d, HH:mm")}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
    </tr>
  );
}
