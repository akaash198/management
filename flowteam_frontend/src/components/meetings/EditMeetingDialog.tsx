"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import type { Meeting, MeetingCallType } from "@/types/meetings";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

function toLocalDatetimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function EditMeetingDialog({
  open,
  onOpenChange,
  teamId,
  meeting,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  meeting: Meeting | null;
  onSaved?: (meeting: Meeting) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [callType, setCallType] = useState<MeetingCallType>("video");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Record<string, boolean>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");

  useEffect(() => {
    if (!open || !meeting) return;
    setTitle(meeting.title ?? "");
    setDescription(meeting.description ?? "");
    setCallType(meeting.call_type ?? "video");
    setStartsAtLocal(toLocalDatetimeInputValue(meeting.starts_at));
    setDurationMinutes(meeting.duration_minutes ?? 30);
    const next: Record<string, boolean> = {};
    for (const a of meeting.attendees ?? []) next[a.id] = true;
    setSelectedMemberIds(next);
    setAttendeeSearch("");
  }, [open, meeting]);

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

  const filteredMembers = useMemo(() => {
    if (!attendeeSearch.trim()) return members;
    const q = attendeeSearch.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.user.full_name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
    );
  }, [members, attendeeSearch]);

  const save = async () => {
    if (!meeting) return;
    if (!startsAtLocal) return toast.error("Pick a date/time.");
    const startsDate = new Date(startsAtLocal);
    if (startsDate.getTime() < Date.now()) {
      return toast.error("Cannot schedule meetings in the past.");
    }
    if (durationMinutes < 5 || durationMinutes > 480) {
      return toast.error("Duration must be between 5 and 480 minutes.");
    }
    setSaving(true);
    try {
      const iso = new Date(startsAtLocal).toISOString();
      const res = await api.patch<ApiResponse<Meeting>>(`/meetings/${meeting.id}/`, {
        title: title.trim() || "Meeting",
        description: description.trim(),
        call_type: callType,
        starts_at: iso,
        duration_minutes: durationMinutes,
        attendee_ids: attendeeIds,
      });
      if (!res.data.success) throw new Error(res.data.error ?? "Failed to save meeting");
      toast.success("Meeting updated");
      onSaved?.(res.data.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to save meeting"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Edit meeting</DialogTitle>
          <DialogDescription>Update the schedule, call type, or attendees.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="editTitle">Title</Label>
            <Input id="editTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="editDesc">Description</Label>
            <Textarea
              id="editDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the meeting agenda or topics..."
              rows={2}
              className="resize-none"
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

            <div className="grid gap-2">
              <Label htmlFor="editStartsAt">Starts at</Label>
              <Input id="editStartsAt" type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2 max-w-[220px]">
            <Label htmlFor="editDuration">Duration (minutes)</Label>
            <Input
              id="editDuration"
              type="number"
              min={5}
              max={24 * 60}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value || "30", 10))}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Attendees</Label>
              {filteredMembers.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-5 px-2 text-[10.5px]"
                  onClick={() => {
                    const allSelected = filteredMembers.every(m => selectedMemberIds[m.user.id]);
                    const next = { ...selectedMemberIds };
                    filteredMembers.forEach(m => {
                      next[m.user.id] = !allSelected;
                    });
                    setSelectedMemberIds(next);
                  }}
                >
                  {filteredMembers.every(m => selectedMemberIds[m.user.id]) ? "Deselect all" : "Select all"}
                </Button>
              )}
            </div>
            {members.length > 5 && (
              <Input
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                placeholder="Search team members..."
                className="h-8 text-xs bg-card"
              />
            )}
            <div className="rounded-xl border border-border bg-muted/10">
              <ScrollArea className="h-[220px]">
                <div className="p-3 space-y-2">
                  {loadingMembers ? (
                    <p className="text-sm text-muted-foreground">Loading members…</p>
                  ) : filteredMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {attendeeSearch ? "No matching team members." : "No team members found."}
                    </p>
                  ) : (
                    filteredMembers.map((m) => {
                      const id = m.user.id;
                      const checked = !!selectedMemberIds[id];
                      return (
                        <label key={id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !meeting || !teamId}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

