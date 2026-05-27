"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Cpu, 
  Clock, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Activity,
  AlertTriangle
} from "lucide-react";
import type { ApiResponse } from "@/types";

interface LogEntry {
  id: string;
  feature_name: string;
  integration_mode: string;
  provider: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  credits_deducted: number;
  latency_ms: number;
  status: "success" | "failed";
  error_message: string | null;
  request_summary: string;
  response_preview: string;
  created_at: string;
}

interface ChartDay {
  date: string;
  cost: number;
  tokens: number;
  count: number;
}

interface DashboardData {
  company_name: string;
  integration_mode: string;
  byok_provider: string;
  byok_model_override: string;
  total_allocated: number;
  credits_used: number;
  remaining_credits: number;
  alert_threshold: number;
  total_requests: number;
  success_requests: number;
  failed_requests: number;
  avg_latency: number;
  total_cost_usd: number;
  total_tokens: number;
  feature_usage: Array<{ feature_name: string; count: number; cost: number }>;
  chart_data: ChartDay[];
  logs: LogEntry[];
}

export function AIUsageDashboard() {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const { data: response, isLoading, error } = useQuery<ApiResponse<DashboardData>>({
    queryKey: ["ai", "dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardData>>("/ai/dashboard/");
      return res.data;
    },
    refetchInterval: 15000, // Autorefresh every 15s
  });

  const data = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
          <AlertTriangle className="text-destructive h-8 w-8" />
          <h3 className="font-bold text-foreground">Failed to Load Dashboard</h3>
          <p className="text-xs text-muted-foreground">Make sure you are a member of a company and have AI features enabled.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate coordinates for pure SVG Area Chart
  const chartHeight = 120;
  const chartWidth = 500;
  const maxVal = Math.max(...data.chart_data.map(d => d.cost), 0.01);
  const points = data.chart_data.map((d, index) => {
    const x = (index / (data.chart_data.length - 1)) * chartWidth;
    const y = chartHeight - (d.cost / maxVal) * chartHeight;
    return { x, y, date: d.date, cost: d.cost };
  });
  
  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaData = pathData ? `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z` : "";

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Allocation status */}
        <Card className="overflow-hidden border-border bg-card relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              {data.integration_mode === "byok" ? `AI Budget (BYOK: ${data.byok_provider || 'custom'})` : "AI Budget / Credits"}
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-1 mt-1">
              ${(data.remaining_credits / 100).toFixed(2)}
              <span className="text-xs text-muted-foreground font-normal">/ ${(data.total_allocated / 100).toFixed(2)} allocated</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((data.credits_used / (data.total_allocated || 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                <span>{(data.credits_used).toFixed(0)} Credits Burned</span>
                <span>{((data.credits_used / (data.total_allocated || 1)) * 100).toFixed(0)}% Used</span>
              </div>
            </div>
            <Coins className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/30" />
          </CardContent>
        </Card>

        {/* Latency card */}
        <Card className="overflow-hidden border-border bg-card relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Avg Latency</CardDescription>
            <CardTitle className="text-2xl font-bold mt-1">
              {data.avg_latency}ms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Based on {data.total_requests} calls. Success rate: {data.total_requests > 0 ? ((data.success_requests / data.total_requests) * 100).toFixed(1) : 100}%
            </p>
            <Clock className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/30" />
          </CardContent>
        </Card>

        {/* Total Cost card */}
        <Card className="overflow-hidden border-border bg-card relative sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Total Consumed</CardDescription>
            <CardTitle className="text-2xl font-bold mt-1">
              {data.total_tokens.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">Tokens</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Estimated model costs: ${data.total_cost_usd.toFixed(4)} USD value.
            </p>
            <Cpu className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/30" />
          </CardContent>
        </Card>
      </div>

      {/* Latency & Token Burn Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Cost Consumption Trend
          </CardTitle>
          <CardDescription className="text-xs">Estimated daily AI API spend (last 15 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full flex flex-col md:flex-row gap-6 items-center">
            {/* Chart Area */}
            <div className="flex-1 w-full relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                  <line 
                    key={i} 
                    x1="0" 
                    y1={chartHeight * r} 
                    x2={chartWidth} 
                    y2={chartHeight * r} 
                    stroke="var(--color-border)" 
                    strokeWidth="0.5" 
                    strokeDasharray="4 4" 
                  />
                ))}
                
                {/* Area */}
                {areaData && <path d={areaData} fill="url(#chartGrad)" />}
                {/* Line */}
                {pathData && <path d={pathData} fill="none" stroke="var(--color-primary)" strokeWidth="2" />}
                
                {/* Points & Hover Labels */}
                {points.map((p, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="3" className="fill-background stroke-primary stroke-2" />
                    <circle cx={p.x} cy={p.y} r="10" className="fill-transparent opacity-0 group-hover:opacity-10" />
                  </g>
                ))}
              </svg>
              <div className="flex justify-between text-[9px] text-muted-foreground font-semibold mt-2 px-1">
                <span>{data.chart_data[0]?.date}</span>
                <span>{data.chart_data[Math.floor(data.chart_data.length / 2)]?.date}</span>
                <span>{data.chart_data[data.chart_data.length - 1]?.date}</span>
              </div>
            </div>

            {/* Feature Usage Stats */}
            <div className="w-full md:w-64 space-y-3 shrink-0">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Usage by Feature</h4>
              <div className="space-y-2">
                {data.feature_usage.slice(0, 5).map((f) => (
                  <div key={f.feature_name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] font-semibold text-foreground">
                      <span className="capitalize">{f.feature_name.replace(/_/g, " ")}</span>
                      <span>{f.count} calls</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full" 
                        style={{ width: `${Math.min((f.count / (data.total_requests || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {data.feature_usage.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/60 italic">No usage recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-accent" /> AI Requests Audit Log
          </CardTitle>
          <CardDescription className="text-xs">Detailed audit records of request payload size, costs, and responses</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="p-3 pl-4">Timestamp</th>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Cost / Deduct</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 pl-4 text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3 font-semibold text-foreground capitalize">
                      {log.feature_name.replace(/_/g, " ")}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{log.model_name}</td>
                    <td className="p-3 font-medium text-foreground">
                      {(log.prompt_tokens + log.completion_tokens).toLocaleString()}
                    </td>
                    <td className="p-3 text-foreground font-semibold">
                      {log.integration_mode === "byok" ? (
                        <span className="text-muted-foreground text-[10px]">BYOK</span>
                      ) : (
                        `-${log.credits_deducted.toFixed(1)}c`
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{log.latency_ms}ms</td>
                    <td className="p-3">
                      {log.status === "success" ? (
                        <Badge className="bg-success/15 hover:bg-success/20 text-success border-success/10 font-bold px-1.5 py-0 gap-1 rounded text-[10px]">
                          <CheckCircle2 size={10} /> OK
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/15 hover:bg-destructive/20 text-destructive border-destructive/10 font-bold px-1.5 py-0 gap-1 rounded text-[10px]">
                          <XCircle size={10} /> ERR
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={() => setSelectedLog(log)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground/60 italic">
                      No logs found. Run an AI action to generate usage logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log details dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col min-h-0">
          {selectedLog && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-sm font-bold capitalize flex items-center gap-2">
                  <Terminal size={14} className="text-primary" /> {selectedLog.feature_name.replace(/_/g, " ")} Details
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Request uuid: {selectedLog.id} · Provider: {selectedLog.provider} · Model: {selectedLog.model_name}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 min-h-0 text-xs text-foreground">
                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-4 p-3 bg-muted/40 border rounded-lg">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Latency</p>
                    <p className="font-bold text-sm mt-0.5">{selectedLog.latency_ms}ms</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Input Tokens</p>
                    <p className="font-bold text-sm mt-0.5">{selectedLog.prompt_tokens}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Output Tokens</p>
                    <p className="font-bold text-sm mt-0.5">{selectedLog.completion_tokens}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Cost</p>
                    <p className="font-bold text-sm mt-0.5">${selectedLog.cost_usd.toFixed(6)}</p>
                  </div>
                </div>

                {/* Error Box */}
                {selectedLog.error_message && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono">
                    <p className="font-bold text-[10px] uppercase">Error Message</p>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap">{selectedLog.error_message}</p>
                  </div>
                )}

                {/* Prompts / Request */}
                <div className="space-y-1.5">
                  <p className="font-semibold text-muted-foreground">Scrubbed Request Prompt Summary</p>
                  <pre className="p-3 bg-muted/60 border rounded-lg overflow-x-auto max-h-40 leading-relaxed font-mono whitespace-pre-wrap text-[11px]">
                    {selectedLog.request_summary || "Empty prompt"}
                  </pre>
                </div>

                {/* Responses */}
                <div className="space-y-1.5">
                  <p className="font-semibold text-muted-foreground">Response Preview</p>
                  <pre className="p-3 bg-muted/60 border rounded-lg overflow-x-auto max-h-56 leading-relaxed font-mono whitespace-pre-wrap text-[11px]">
                    {selectedLog.response_preview || "Empty response"}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
