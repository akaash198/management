"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AuditLog } from "@/types/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  User, 
  Shield, 
  Download,
  AlertTriangle,
  LogIn,
  LogOut,
  Mail,
  FileDown
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useTeamStore } from "@/store/team";

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ model: "", action: "" });
  const { activeTeamId, fetchTeams } = useTeamStore();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const { data, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit", activeTeamId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        team_id: activeTeamId ?? "",
        ...filters 
      });
      const res = await api.get(`/audit/audit/?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!activeTeamId,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <LogIn size={14} />;
      case 'logout': return <LogOut size={14} />;
      case 'permission_change': return <Shield size={14} />;
      case 'invite_sent': return <Mail size={14} />;
      case 'export': return <FileDown size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'update': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'delete': return "bg-red-50 text-red-700 border-red-100";
      case 'export': return "bg-purple-50 text-purple-700 border-purple-100";
      case 'permission_change': return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="p-8 space-y-8 min-h-screen bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Audit Log</h1>
          <p className="text-slate-500">Track all sensitive actions and administrative changes.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download size={16} />
          Export Log
        </Button>
      </div>

      <Card className="border-none shadow-sm h-full">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white rounded-t-xl">
           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   placeholder="Search activity..." 
                   className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-primary w-64"
                 />
              </div>
              <select 
                className="bg-slate-100 rounded-lg text-sm border-none p-2"
                onChange={(e) => setFilters(f => ({ ...f, model: e.target.value }))}
              >
                  <option value="">All Models</option>
                  <option value="Task">Tasks</option>
                  <option value="Project">Projects</option>
                  <option value="Team">Team</option>
              </select>
           </div>
           <div className="text-xs text-slate-400 font-medium">
             Showing {data?.length || 0} events
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b">
                <tr>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  [1,2,3,4,5].map(i => <LogSkeleton key={i} />)
                ) : (
                  data?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 group transition-colors cursor-pointer">
                       <td className="px-6 py-5">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-slate-900 line-clamp-1">{log.object_repr}</span>
                             <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{log.model_name}</span>
                          </div>
                       </td>
                       <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-full bg-slate-100 border flex items-center justify-center overflow-hidden">
                                {log.actor?.avatar ? (
                                  <img src={log.actor.avatar} className="h-full w-full object-cover" />
                                ) : (
                                  <User size={12} className="text-slate-400" />
                                )}
                             </div>
                             <span className="text-sm font-medium">{log.actor?.full_name || 'System'}</span>
                          </div>
                       </td>
                       <td className="px-6 py-5">
                          <Badge variant="outline" className={cn("gap-1.5 rounded-full px-2.5 py-0.5 font-bold uppercase text-[9px]", getActionBadge(log.action))}>
                             {getActionIcon(log.action)}
                             {log.action.replace('_', ' ')}
                          </Badge>
                       </td>
                       <td className="px-6 py-5">
                          <code className="text-[10px] font-mono p-1 bg-slate-100 rounded text-slate-500">
                             {log.ip_address || "0.0.0.0"}
                          </code>
                       </td>
                       <td className="px-6 py-5">
                          <div className="flex flex-col text-right">
                             <span className="text-xs font-bold text-slate-700">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                             <span className="text-[10px] text-slate-400 font-medium">{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
                          </div>
                       </td>
                    </tr>
                  ))
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
       <td className="px-6 py-5"><Skeleton className="h-4 w-48" /></td>
       <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
       <td className="px-6 py-5"><Skeleton className="h-6 w-20 rounded-full" /></td>
       <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
       <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
    </tr>
  );
}

import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
