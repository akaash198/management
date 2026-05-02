"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Copy, Pencil, Plus, Search, Trash2, Video } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { Meeting } from "@/types/meetings";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { EditMeetingDialog } from "@/components/meetings/EditMeetingDialog";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function MeetingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeTeamId, fetchTeams } = useTeamStore();
  const user = useAuthStore((s) => s.user);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);

  const [q, setQ] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [status, setStatus] = useState<string>("all");
  const [callType, setCallType] = useState<string>("all");

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    const end = new Date(now);
    end.setDate(end.getDate() + 45);
    return { start: dateOnly(start), end: dateOnly(end) };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["meetings", activeTeamId, range, q, mineOnly, status],
    queryFn: async () => {
      const qs = new URLSearchParams({ start: range.start, end: range.end });
      if (q.trim()) qs.set("q", q.trim());
      if (mineOnly) qs.set("mine", "true");
      if (status !== "all") qs.set("status", status);
      const res = await api.get<ApiResponse<Meeting[]>>(`/meetings/teams/${activeTeamId}/meetings/?${qs.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeTeamId,
  });

  const allMeetings = data ?? [];
  const meetings = useMemo(() => {
    if (callType === "all") return allMeetings;
    return allMeetings.filter((m) => m.call_type === callType);
  }, [allMeetings, callType]);

  const { upcoming, recentPast, nextUp } = useMemo(() => {
    const now = Date.now();
    const upcoming = meetings
      .filter((m) => new Date(m.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const recentPast = meetings
      .filter((m) => new Date(m.starts_at).getTime() < now)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    return { upcoming, recentPast, nextUp: upcoming[0] ?? null };
  }, [meetings]);

  const copyMeetingLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meetings/${id}`);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const cancelMeeting = async (m: Meeting) => {
    if (!confirm(`Cancel "${m.title}"?`)) return;
    try {
      await api.patch(`/meetings/${m.id}/`, { status: "cancelled" });
      toast.success("Meeting cancelled");
      qc.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to cancel meeting"));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Meetings</h1>
            <p className="text-sm text-muted-foreground">Create instant meetings or schedule future calls.</p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={!activeTeamId}>
          <Plus className="h-4 w-4" />
          New meeting
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find meetings
          </CardTitle>
          <CardDescription>Search, filter, and quickly copy links or cancel scheduled meetings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="meetingSearch">Search</Label>
            <Input
              id="meetingSearch"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g., standup, retro, planning…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Call type</Label>
            <Select value={callType} onValueChange={setCallType}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">My meetings only</p>
              <p className="text-xs text-muted-foreground">Shows meetings where you’re listed as an attendee.</p>
            </div>
            <Switch checked={mineOnly} onCheckedChange={(v) => setMineOnly(v === true)} />
          </div>
        </CardContent>
      </Card>

      {nextUp && (
        <Card className="border-primary/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(99,102,241,0.03)_55%,rgba(255,255,255,0.9)_100%)]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Next up
              </span>
              <Badge variant="secondary" className="capitalize">{nextUp.call_type}</Badge>
            </CardTitle>
            <CardDescription>
              {nextUp.title} • {formatDistanceToNowStrict(new Date(nextUp.starts_at), { addSuffix: true })} • {nextUp.duration_minutes} min
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button onClick={() => router.push(`/meetings/${nextUp.id}`)} className="gap-2">
              Open
            </Button>
            <Button variant="outline" onClick={() => copyMeetingLink(nextUp.id)} className="gap-2">
              <Copy className="h-4 w-4" /> Copy link
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Upcoming & recent
          </CardTitle>
          <CardDescription>Meetings from the last 2 weeks through the next 45 days.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : meetings.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No meetings match your filters.</p>
              <Button size="sm" className="gap-2 w-fit" onClick={() => setCreateOpen(true)} disabled={!activeTeamId}>
                <Plus className="h-4 w-4" /> Create one
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Upcoming</p>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {upcoming.map((m) => (
                      <div key={m.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                        <button className="min-w-0 text-left flex-1" onClick={() => router.push(`/meetings/${m.id}`)}>
                          <p className="font-semibold truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(m.starts_at).toLocaleString()} • {m.duration_minutes} min • {(m.attendees ?? []).length} attendees
                          </p>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn("capitalize", m.status === "cancelled" && "text-destructive")}>
                            {m.status}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">{m.call_type}</Badge>
                          <Button variant="outline" size="icon" aria-label="Copy link" onClick={() => copyMeetingLink(m.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => { setEditTarget(m); setEditOpen(true); }}
                            disabled={!user}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label="Cancel meeting"
                            onClick={() => cancelMeeting(m)}
                            disabled={m.status !== "scheduled"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Recent</p>
                {recentPast.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent meetings.</p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {recentPast.slice(0, 12).map((m) => (
                      <div key={m.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                        <button className="min-w-0 text-left flex-1" onClick={() => router.push(`/meetings/${m.id}`)}>
                          <p className="font-semibold truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(m.starts_at).toLocaleString()} • {m.duration_minutes} min
                          </p>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn("capitalize", m.status === "cancelled" && "text-destructive")}>
                            {m.status}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">{m.call_type}</Badge>
                          <Button variant="outline" size="icon" aria-label="Copy link" onClick={() => copyMeetingLink(m.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateMeetingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teamId={activeTeamId ?? null}
        defaultMode="instant"
        redirectToMeeting
      />

      <EditMeetingDialog
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTarget(null); }}
        teamId={activeTeamId ?? null}
        meeting={editTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ["meetings"] })}
      />
    </div>
  );
}

