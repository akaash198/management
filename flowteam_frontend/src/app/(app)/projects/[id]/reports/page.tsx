"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { 
  ProjectHealth, 
  VelocityWeek, 
  BurndownPoint, 
  MemberStat 
} from "@/types/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users,
  Download,
  Calendar,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import { Skeleton } from "@/components/ui/skeleton";
import { AIGate } from "@/components/ai/AIGate";
import { AIButton } from "@/components/ai/AIButton";
import { ProjectTopNav } from "@/components/projects/ProjectTopNav";

export default function ReportsPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <ProjectTopNav projectId={id as string} />
      <div className="p-8 space-y-8 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Insights</h1>
          <p className="text-slate-500">Deep dive into project performance, velocity, and team health.</p>
        </div>
        <ExportDropdown projectId={id as string} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-white border p-1 h-12 gap-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg px-6">Overview</TabsTrigger>
          <TabsTrigger value="velocity" className="rounded-lg px-6">Velocity</TabsTrigger>
          <TabsTrigger value="burndown" className="rounded-lg px-6">Burndown</TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg px-6">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 outline-none">
          <OverviewTab projectId={id as string} />
        </TabsContent>
        <TabsContent value="velocity" className="outline-none">
          <VelocityTab projectId={id as string} />
        </TabsContent>
        <TabsContent value="burndown" className="outline-none">
          <BurndownTab projectId={id as string} />
        </TabsContent>
        <TabsContent value="members" className="outline-none">
          <MembersTab projectId={id as string} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function OverviewTab({ projectId }: { projectId: string }) {
  type AIHealthScore = {
    score: number;
    label: string;
    factors?: Array<{ issue: string; severity: string }>;
    recommendation?: string;
  };

  const [aiRefresh, setAiRefresh] = useState(0);
  const { data: aiHealth, isLoading: aiLoading } = useQuery<AIHealthScore>({
    queryKey: ["ai", "health-score", projectId, aiRefresh],
    queryFn: async () => {
      const res = await api.get(`/ai/health-score/?project_id=${projectId}`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const { data: health, isLoading: healthLoading } = useQuery<ProjectHealth>({
    queryKey: ["analytics", "health", projectId],
    queryFn: async () => {
      const res = await api.get(`/analytics/project-health/?project_id=${projectId}`);
      return res.data.data;
    }
  });

  if (healthLoading) return <OverviewSkeleton />;

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-emerald-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-8">
      <AIGate featureName="Project health score">
        <Card className="overflow-hidden border border-border bg-white">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">AI Project Health</CardTitle>
              <p className="text-xs text-muted-foreground">AI score with risk factors and recommendations.</p>
            </div>
            <AIButton variant="outline" size="sm" className="h-8 text-[12px]" loading={aiLoading} onClick={() => setAiRefresh((v) => v + 1)}>
              Refresh
            </AIButton>
          </CardHeader>
          <CardContent>
            {!aiHealth && (
              <p className="text-sm text-muted-foreground">{aiLoading ? "Loading…" : "No data yet."}</p>
            )}
            {aiHealth && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <div
                      className={cn(
                        "text-3xl font-bold",
                        aiHealth.score >= 80 ? "text-green-500" : aiHealth.score >= 50 ? "text-amber-500" : "text-red-500"
                      )}
                    >
                      {aiHealth.score}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[11px]">
                    {aiHealth.label}
                  </Badge>
                </div>
                {!!aiHealth.factors?.length && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Factors</p>
                    <ul className="list-disc space-y-1 pl-4 text-[12px] text-muted-foreground">
                      {aiHealth.factors.slice(0, 6).map((f, idx) => (
                        <li key={`${f.issue}-${idx}`}>
                          {f.issue} ({f.severity})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!aiHealth.recommendation && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-[12px] text-foreground">
                    {aiHealth.recommendation}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </AIGate>

      {/* Health Score Card */}
      <Card className="overflow-hidden border-none shadow-xl bg-white">
        <div className={cn("h-1 w-full", getProgressColor(health?.health_score || 0))} />
        <CardContent className="p-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]">Project Health</Badge>
                <span className={cn("text-sm font-bold", getHealthColor(health?.health_score || 0))}>
                  {health?.health_label}
                </span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight">Your project is looking {health?.health_label.toLowerCase()}.</h2>
              <div className="space-y-4">
                {health?.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-slate-700 font-medium">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center flex-col items-center gap-4">
              <div className="relative h-48 w-48 flex items-center justify-center">
                 <svg className="h-full w-full rotate-[-90deg]">
                   <circle 
                     cx="96" cy="96" r="80" 
                     className="stroke-slate-100 fill-none" 
                     strokeWidth="12" 
                   />
                   <circle 
                     cx="96" cy="96" r="80" 
                     className={cn("fill-none transition-all duration-1000 ease-out", getHealthColor(health?.health_score || 0).replace('text-', 'stroke-'))}
                     strokeWidth="12" 
                     strokeLinecap="round"
                     strokeDasharray={2 * Math.PI * 80}
                     strokeDashoffset={2 * Math.PI * 80 * (1 - (health?.health_score || 0) / 100)}
                   />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-5xl font-black">{health?.health_score}</span>
                   <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Score</span>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {Object.entries(health?.factors || {}).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{key.replace('_', ' ')}</p>
                    <p className="text-lg font-bold">{(val * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
         <Card>
            <CardHeader><CardTitle className="text-lg">Recent Activity Velocity</CardTitle></CardHeader>
            <CardContent className="h-64">
               {/* Mini chart placeholder */}
               <div className="flex items-center justify-center h-full text-slate-300">
                  <Activity size={48} className="animate-pulse" />
               </div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader><CardTitle className="text-lg">Top Contributors</CardTitle></CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                       </div>
                       <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

function VelocityTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<VelocityWeek[]>({
    queryKey: ["analytics", "velocity", projectId],
    queryFn: async () => {
      const res = await api.get(`/analytics/velocity/?project_id=${projectId}`);
      return res.data.data;
    }
  });

  if (isLoading) return <div className="h-96 w-full animate-pulse bg-slate-100 rounded-xl" />;

  return (
    <Card className="p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold">Team Velocity</h3>
        <p className="text-sm text-slate-500">Tasks created vs. completed by week.</p>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
           <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week_start" tickFormatter={(v) => format(new Date(v), "MMM d")} />
              <YAxis />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={36} />
              <Bar name="Created" dataKey="created" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar name="Completed" dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
           </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BurndownTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<BurndownPoint[]>({
    queryKey: ["analytics", "burndown", projectId],
    queryFn: async () => {
      const res = await api.get(`/analytics/burndown/?project_id=${projectId}`);
      return res.data.data;
    }
  });

  if (isLoading) return <div className="h-96 w-full animate-pulse bg-slate-100 rounded-xl" />;

  return (
    <Card className="p-8">
       <div className="mb-8">
        <h3 className="text-xl font-bold">Burndown Chart</h3>
        <p className="text-sm text-slate-500">Actual remaining work vs. ideal linear progression.</p>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={data}>
              <defs>
                <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "MMM d")} />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="top" align="right" height={36} />
              <Area 
                name="Remaining Tasks" 
                type="monotone" 
                dataKey="open_tasks" 
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorOpen)" 
                strokeWidth={2}
              />
              <Line 
                name="Ideal Burndown" 
                type="monotone" 
                dataKey="ideal" 
                stroke="#cbd5e1" 
                strokeDasharray="5 5" 
                dot={false}
              />
           </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MembersTab({ projectId }: { projectId: string }) {
  // Static for now, would fetch from /analytics/member-stats/
  const { data, isLoading } = useQuery<MemberStat[]>({
    queryKey: ["analytics", "member-stats", projectId],
    queryFn: async () => {
      const res = await api.get(`/analytics/member-stats/?project_id=${projectId}`);
      return res.data.data;
    }
  });

  if (isLoading) return <OverviewSkeleton />;

  return (
    <div className="space-y-6">
       {data?.map((m, i) => (
         <Card key={i} className="hover:shadow-md transition-all">
            <CardContent className="p-6">
                <div className="grid grid-cols-5 gap-6 items-center">
                   <div className="flex items-center gap-4">
                      <img src={m.user.avatar || ""} className="h-10 w-10 rounded-full border bg-slate-100" />
                      <div>
                         <p className="font-bold text-sm">{m.user.full_name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase">{m.user.role || 'Member'}</p>
                      </div>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Created / Completed</p>
                      <p className="text-lg font-bold">{m.tasks_assigned} / {m.tasks_completed}</p>
                   </div>
                   <div className="col-span-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Completion Rate</p>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${m.completion_rate}%` }} />
                      </div>
                      <p className="text-right text-[10px] font-bold mt-1">{m.completion_rate.toFixed(0)}%</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Avg Days</p>
                      <p className="text-lg font-bold">{m.avg_completion_days}d</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Time Logged</p>
                      <p className="text-lg font-bold">{m.total_hours_logged}h</p>
                   </div>
                </div>
            </CardContent>
         </Card>
       ))}
    </div>
  );
}

function ExportDropdown({ projectId }: { projectId: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const res = await api.get(`/projects/${projectId}/export/?format=${format}`, {
        responseType: 'blob'
      });
      const extension = format === 'xlsx' ? 'xlsx' : format;
      saveAs(res.data, `project_export_${projectId}.${extension}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting}>
        <Download size={14} className="mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} disabled={isExporting}>
        <Download size={14} className="mr-2" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting}>
        <Download size={14} className="mr-2" />
        PDF
      </Button>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-64 w-full bg-slate-100 rounded-3xl" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="h-64 bg-slate-100 rounded-3xl" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
