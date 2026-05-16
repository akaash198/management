"use client";

import { useQuery } from "@tanstack/react-query";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Line, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import api from "@/lib/api";
import type { BurndownPoint } from "@/types/analytics";

export default function BurndownTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<BurndownPoint[]>({
    queryKey: ["analytics", "burndown", projectId],
    queryFn: async () => {
      const res = await api.get(`/analytics/burndown/?project_id=${projectId}`);
      return res.data.data;
    },
  });

  if (isLoading) return <div className="h-96 w-full animate-pulse bg-muted rounded-xl" />;

  return (
    <Card className="p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold">Burndown Chart</h3>
        <p className="text-sm text-muted-foreground">Actual remaining work vs. ideal linear progression.</p>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "MMM d")} stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }} />
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
              stroke="var(--color-muted-foreground)"
              strokeDasharray="5 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
