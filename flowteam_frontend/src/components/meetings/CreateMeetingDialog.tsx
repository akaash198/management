"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import type { Meeting, MeetingCallType } from "@/types/meetings";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type Mode = "instant" | "schedule";

export function CreateMeetingDialog({
  open,
  onOpenChange,
  teamId,
  defaultMode = "instant",
  onCreated,
  redirectToMeeting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  defaultMode?: Mode;
  onCreated?: (meeting: Meeting) => void;
  redirectToMeeting?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [title, setTitle] = useState("");
  const [callType, setCallType] = useState<MeetingCallType>("video");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Record<string, boolean>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
  }, [defaultMode, open]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!open || !teamId) return;
      setLoadingMembers(true);
      try {
        const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${teamId}/members/`);
        setMembers(res.data.data ?? []);
      } catch (err) {
        setMembers([]);
        toast.error(toErrorMessage(err, "Failed to load team members"));
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [open, teamId]);

  const attendeeIds = useMemo(
    () => Object.entries(selectedMemberIds).filter(([, on]) => on).map(([id]) => id),
    [selectedMemberIds]
  );

  const reset = () => {
    setTitle("");
    setCallType("video");
    setStartsAtLocal("");
    setDurationMinutes(30);
    setSelectedMemberIds({});
  };

  const create = async () => {
    if (!teamId) return toast.error("Select a team first.");
    if (mode === "schedule" && !startsAtLocal) return toast.error("Pick a date/time.");
    setSaving(true);
    try {
      if (mode === "instant") {
        const res = await api.post<ApiResponse<Meeting>>(`/meetings/teams/${teamId}/meetings/instant/`, {
          title: title.trim() || "Instant meeting",
          call_type: callType,
          attendee_ids: attendeeIds,
        });
        if (!res.data.success) throw new Error(res.data.error ?? "Failed to create meeting");
        toast.success("Instant meeting created");
        onCreated?.(res.data.data);
        if (redirectToMeeting) router.push(`/meetings/${res.data.data.id}`);
        onOpenChange(false);
        reset();
        return;
      }

      const iso = new Date(startsAtLocal).toISOString();
      const res = await api.post<ApiResponse<Meeting>>(`/meetings/teams/${teamId}/meetings/`, {
        title: title.trim() || "Scheduled meeting",
        call_type: callType,
        starts_at: iso,
        duration_minutes: durationMinutes,
        attendee_ids: attendeeIds,
      });
      if (!res.data.success) throw new Error(res.data.error ?? "Failed to schedule meeting");
      toast.success("Meeting scheduled");
      onCreated?.(res.data.data);
      if (redirectToMeeting) router.push(`/meetings/${res.data.data.id}`);
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to create meeting"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Create meeting</DialogTitle>
          <DialogDescription>Start an instant call or schedule a meeting with your team.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "instant" ? "default" : "outline"}
            onClick={() => setMode("instant")}
          >
            Instant
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "schedule" ? "default" : "outline"}
            onClick={() => setMode("schedule")}
          >
            Schedule
          </Button>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="meetingTitle">Title</Label>
            <Input
              id="meetingTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "instant" ? "Instant sync" : "Weekly standup"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Call type</Label>
              <Select value={callType} onValueChange={(v) => setCallType(v as MeetingCallType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "schedule" && (
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAtLocal}
                  onChange={(e) => setStartsAtLocal(e.target.value)}
                />
              </div>
            )}
          </div>

          {mode === "schedule" && (
            <div className="grid gap-2 max-w-[220px]">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={24 * 60}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value || "30", 10))}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Attendees (optional)</Label>
            <div className="rounded-xl border border-border bg-muted/10">
              <ScrollArea className="h-[220px]">
                <div className="p-3 space-y-2">
                  {loadingMembers ? (
                    <p className="text-sm text-muted-foreground">Loading members…</p>
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No team members found.</p>
                  ) : (
                    members.map((m) => {
                      const id = m.user.id;
                      const checked = !!selectedMemberIds[id];
                      return (
                        <label
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.user.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                          </div>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => setSelectedMemberIds((prev) => ({ ...prev, [id]: next === true }))}
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
            <p className="text-xs text-muted-foreground">
              If you leave this empty, you can still share the meeting link with your team later.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving || !teamId}>
            {saving ? "Saving…" : mode === "instant" ? "Create & open" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
