"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import api from "@/lib/api";
import type { VelocityWeek } from "@/types/analytics";

export default function VelocityTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<VelocityWeek[]>({
    queryKey: ["analytics", "velocity", projectId],
    queryFn: async () => {
      const res = await api.get(`/analytics/velocity/?project_id=${projectId}`);
      return res.data.data;
    },
  });

  if (isLoading) return <div className="h-96 w-full animate-pulse bg-muted rounded-xl" />;

  return (
    <Card className="p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold">Team Velocity</h3>
        <p className="text-sm text-muted-foreground">Tasks created vs. completed by week.</p>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="week_start" tickFormatter={(v) => format(new Date(v), "MMM d")} stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-foreground)", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.4)" }}
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
