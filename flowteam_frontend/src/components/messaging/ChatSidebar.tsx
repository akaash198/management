"use client";

import { Channel } from "@/types/messaging";
import { Bell, BellOff, BellRing, CheckCircle2, EyeOff, Hash, Lock, MessageSquare, MoreHorizontal, Plus, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

interface ChatSidebarProps {
  channels: Channel[];
  selectedId: string;
  onSelect: (channel: Channel) => void;
  isLoading?: boolean;
  teamId?: string;
  onRefreshChannels?: () => void;
  onStartDirectMessage?: (userId: string) => void;
  onCreateChannel?: (input: {
    name: string; display_name?: string; description?: string | null;
    is_private: boolean; member_ids?: string[];
  }) => void;
  onlineUserIds?: Set<string>;
}

function slugify(input: string) {
  return input.trim().toLowerCase()
    .replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 100);
}

function isMeetingChannel(channel: Channel) {
  return (channel.name || "").startsWith("mtg-");
}

function isDmChannel(channel: Channel) {
  if (!channel.is_private) return false;
  if (channel.dm_other_user_id) return true;
  return (channel.name || "").startsWith("dm-");
}

export function ChatSidebar({
  channels, selectedId, onSelect, isLoading, teamId,
  onStartDirectMessage, onCreateChannel, onlineUserIds, onRefreshChannels,
}: ChatSidebarProps) {
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showMuted, setShowMuted] = useState(true);
  const [dmOpen, setDmOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelDisplayName, setChannelDisplayName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelPrivate, setChannelPrivate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key?.toLowerCase() !== "k") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const unreadTotal = useMemo(
    () => channels.reduce((acc, c) => acc + (c.is_muted ? 0 : (c.unread_count || 0)), 0),
    [channels]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = channels.filter((c) => {
      // Hide meeting channels by default (they are auto-created for meetings).
      // Still show if currently selected, or explicitly searched.
      if (isMeetingChannel(c) && c.id !== selectedId && !q) return false;

      if (!showMuted && c.is_muted) return false;
      if (unreadOnly && (c.unread_count || 0) <= 0) return false;
      if (!q) return true;
      const name = (c.display_name || c.name || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    return filtered.slice().sort((a, b) => {
      const aMuted = !!a.is_muted;
      const bMuted = !!b.is_muted;
      if (aMuted !== bMuted) return aMuted ? 1 : -1;

      const aUnread = aMuted ? 0 : (a.unread_count || 0);
      const bUnread = bMuted ? 0 : (b.unread_count || 0);
      if (aUnread !== bUnread) return bUnread - aUnread;

      const aLast = a.last_message?.created_at ? Date.parse(a.last_message.created_at) : 0;
      const bLast = b.last_message?.created_at ? Date.parse(b.last_message.created_at) : 0;
      if (aLast !== bLast) return bLast - aLast;

      const aName = (a.display_name || a.name || "").toLowerCase();
      const bName = (b.display_name || b.name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [channels, query, showMuted, unreadOnly]);

  const publicChannels = useMemo(() => visible.filter((c) => !c.is_private), [visible]);
  const directMessages = useMemo(() => visible.filter((c) => isDmChannel(c)), [visible]);
  const privateChannels = useMemo(
    () => visible.filter((c) => c.is_private && !isDmChannel(c) && !isMeetingChannel(c)),
    [visible]
  );

  useEffect(() => {
    const load = async () => {
      if ((!dmOpen && !channelOpen) || !teamId) return;
      try {
        setMembersLoading(true);
        const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${teamId}/members/`);
        setTeamMembers(res.data.data ?? []);
      } catch { setTeamMembers([]); }
      finally { setMembersLoading(false); }
    };
    load();
  }, [dmOpen, channelOpen, teamId]);

  const filteredMembers = useMemo(() => {
    const q = dmQuery.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter((m) => {
      const name  = (m.user.full_name ?? "").toLowerCase();
      const email = (m.user.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teamMembers, dmQuery]);

  const resetChannelDialog = () => {
    setChannelName(""); setChannelDisplayName(""); setChannelDescription("");
    setChannelPrivate(false); setSelectedMemberIds(new Set());
  };

  const markRead = async (channelId: string) => {
    try {
      await api.post(`/messaging/channels/${channelId}/mark-read/`);
      onRefreshChannels?.();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to mark as read"));
    }
  };

  const markUnread = async (channel: Channel) => {
    if (!channel.last_message?.id) {
      toast.error("No messages yet");
      return;
    }
    try {
      await api.post(`/messaging/channels/${channel.id}/mark-unread/`, { message_id: channel.last_message.id });
      onRefreshChannels?.();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to mark as unread"));
    }
  };

  const mute = async (channelId: string, input?: { minutes?: number; forever?: boolean }) => {
    try {
      await api.post(`/messaging/channels/${channelId}/mute/`, input ?? { minutes: 60 });
      toast.success("Channel muted");
      onRefreshChannels?.();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to mute channel"));
    }
  };

  const unmute = async (channelId: string) => {
    try {
      await api.post(`/messaging/channels/${channelId}/unmute/`);
      toast.success("Channel unmuted");
      onRefreshChannels?.();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to unmute channel"));
    }
  };

  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col border-r sidebar-shell">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[hsl(220_18%_20%)] px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>Workspace Inbox</div>
            <span className="mt-0.5 block text-[15px] font-bold tracking-[-0.02em] text-white">Messages</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-[hsl(220_18%_18%)]"
                style={{ color: "hsl(var(--sidebar-fg-muted))" }}
                aria-label="New conversation"
              >
                <Plus size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setDmOpen(true)}>New direct message</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (!onCreateChannel) { toast.error("Channel creation is not available"); return; }
                  setChannelOpen(true);
                }}
              >
                New channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "hsl(var(--sidebar-fg-muted))" }} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search… (Ctrl+K)"
            className="h-8 w-full rounded-md border pl-8 pr-3 text-[12px] outline-none focus:ring-1 transition-colors"
            style={{
              borderColor: "hsl(var(--sidebar-border))",
              background: "hsl(var(--sidebar-hover-bg))",
              color: "hsl(var(--sidebar-fg))",
            }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all",
              unreadOnly
                ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                : "border-transparent bg-[hsl(220_18%_18%)] text-[hsl(220_10%_55%)] hover:bg-[hsl(220_18%_22%)]"
            )}
            aria-pressed={unreadOnly}
          >
            <CheckCircle2 size={11} />
            Unread
            {unreadTotal > 0 && (
              <span className={cn(
                "ml-0.5 rounded-full px-1.5 py-px text-[9px] font-bold",
                unreadOnly ? "bg-indigo-400/30 text-indigo-200" : "bg-[hsl(239_84%_60%)] text-white"
              )}>
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowMuted((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all",
              !showMuted
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-transparent bg-[hsl(220_18%_18%)] text-[hsl(220_10%_55%)] hover:bg-[hsl(220_18%_22%)]"
            )}
            aria-pressed={!showMuted}
            title={showMuted ? "Showing muted — click to hide" : "Hiding muted — click to show"}
          >
            <EyeOff size={11} />
            {showMuted ? "Muted on" : "Muted off"}
          </button>
        </div>
      </div>

      {/* ── Channel list ── */}
      <ScrollArea className="flex-1 py-2">
        <SectionLabel>Channels</SectionLabel>
        <div className="mb-4 space-y-0.5 px-2">
          {isLoading ? (
            [1,2,3].map((i) => <SkeletonRow key={i} />)
          ) : publicChannels.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] italic" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>No channels found.</p>
          ) : publicChannels.map((ch) => (
            <ChannelRow
              key={ch.id}
              channel={ch}
              active={selectedId === ch.id}
              onSelect={onSelect}
              onMarkRead={markRead}
              onMarkUnread={markUnread}
              onMute={mute}
              onUnmute={unmute}
            />
          ))}
        </div>

        <SectionLabel>Private Channels</SectionLabel>
        <div className="mb-4 space-y-0.5 px-2">
          {isLoading ? (
            [1,2].map((i) => <SkeletonRow key={`priv-${i}`} />)
          ) : privateChannels.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] italic" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>No private channels yet.</p>
          ) : privateChannels.map((ch) => (
            <ChannelRow
              key={ch.id}
              channel={ch}
              active={selectedId === ch.id}
              onSelect={onSelect}
              onMarkRead={markRead}
              onMarkUnread={markUnread}
              onMute={mute}
              onUnmute={unmute}
            />
          ))}
        </div>

        <SectionLabel>Direct Messages</SectionLabel>
        <div className="space-y-0.5 px-2 pb-3">
          {isLoading ? (
            [1,2].map((i) => <SkeletonRow key={i} />)
          ) : directMessages.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] italic" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>No direct messages yet.</p>
          ) : directMessages.map((ch) => (
            <DmRow
              key={ch.id}
              channel={ch}
              active={selectedId === ch.id}
              onSelect={onSelect}
              onlineUserIds={onlineUserIds}
              onMarkRead={markRead}
              onMarkUnread={markUnread}
              onMute={mute}
              onUnmute={unmute}
            />
          ))}
        </div>
      </ScrollArea>

      {/* ── DM dialog ── */}
      <Dialog open={dmOpen} onOpenChange={(o) => { setDmOpen(o); if (!o) setDmQuery(""); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>New direct message</DialogTitle>
            <DialogDescription>Search for a teammate to start a private chat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dmSearch">Search</Label>
            <Input
              id="dmSearch"
              value={dmQuery}
              onChange={(e) => setDmQuery(e.target.value)}
              placeholder="Name or email…"
            />
          </div>
          <div className="mt-1 max-h-[300px] overflow-auto rounded-xl border border-border">
            {membersLoading ? (
              <p className="p-4 text-[13px] text-muted-foreground">Loading…</p>
            ) : filteredMembers.length === 0 ? (
              <p className="p-4 text-[13px] text-muted-foreground">No matches.</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredMembers.map((m) => {
                  const online = !!onlineUserIds?.has(m.user.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left transition-colors"
                      onClick={() => { onStartDirectMessage?.(m.user.id); setDmOpen(false); }}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.user.avatar_url || ""} />
                          <AvatarFallback className="text-[11px]">{(m.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                          online ? "bg-emerald-500" : "bg-amber-400"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium truncate">{m.user.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.user.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <User size={12} /> Message
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDmOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create channel dialog ── */}
      <Dialog open={channelOpen} onOpenChange={(o) => { setChannelOpen(o); if (!o) resetChannelDialog(); }}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>New channel</DialogTitle>
            <DialogDescription>Create a channel for your team to collaborate in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="chName">Channel name</Label>
              <Input
                id="chName"
                value={channelName}
                onChange={(e) => { setChannelName(e.target.value); if (!channelDisplayName) setChannelDisplayName(e.target.value); }}
                placeholder="e.g. engineering-updates"
              />
              <p className="text-[11px] text-muted-foreground">
                Slug: <span className="font-mono">#{slugify(channelName)}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chDisplay">Display name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="chDisplay"
                value={channelDisplayName}
                onChange={(e) => setChannelDisplayName(e.target.value)}
                placeholder="e.g. Engineering Updates"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chDesc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="chDesc"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                placeholder="What is this channel for?"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={channelPrivate}
                onChange={(e) => setChannelPrivate(e.target.checked)}
                className="rounded"
              />
              Private channel — only selected members
            </label>

            {channelPrivate && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Add members
                </div>
                <div className="max-h-[220px] overflow-auto divide-y divide-border">
                  {membersLoading ? (
                    <p className="p-4 text-[13px] text-muted-foreground">Loading…</p>
                  ) : teamMembers.length === 0 ? (
                    <p className="p-4 text-[13px] text-muted-foreground">No members found.</p>
                  ) : teamMembers.map((m) => {
                    const checked = selectedMemberIds.has(m.user.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 text-left transition-colors"
                        onClick={() => {
                          setSelectedMemberIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.user.id)) next.delete(m.user.id); else next.add(m.user.id);
                            return next;
                          });
                        }}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.user.avatar_url || ""} />
                          <AvatarFallback className="text-[10px]">{(m.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate">{m.user.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.user.email}</p>
                        </div>
                        <span className={cn("text-[11px] font-semibold", checked ? "text-primary" : "text-muted-foreground")}>
                          {checked ? "Added ✓" : "Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!onCreateChannel) return;
                const slug = slugify(channelName);
                if (!slug) { toast.error("Channel name is required"); return; }
                onCreateChannel({
                  name: slug,
                  display_name: channelDisplayName.trim() || undefined,
                  description: channelDescription.trim() || null,
                  is_private: channelPrivate,
                  member_ids: channelPrivate ? Array.from(selectedMemberIds) : [],
                });
                setChannelOpen(false);
              }}
            >
              Create channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>
      {children}
    </p>
  );
}

function SkeletonRow() {
  return <div className="mx-1 h-[52px] rounded-lg animate-pulse mb-0.5" style={{ background: "hsl(var(--sidebar-hover-bg))" }} />;
}

function ChannelRow({
  channel,
  active,
  onSelect,
  onMarkRead,
  onMarkUnread,
  onMute,
  onUnmute,
}: {
  channel: Channel;
  active: boolean;
  onSelect: (c: Channel) => void;
  onMarkRead: (channelId: string) => void;
  onMarkUnread: (channel: Channel) => void;
  onMute: (channelId: string, input?: { minutes?: number; forever?: boolean }) => void;
  onUnmute: (channelId: string) => void;
}) {
  const hasUnread = channel.unread_count > 0 && !active && !channel.is_muted;
  return (
    <button
      onClick={() => onSelect(channel)}
      className={cn(
        "nav-item group w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] rounded-md",
        active && "active"
      )}
      style={{ whiteSpace: "normal", alignItems: "flex-start" }}
    >
      {/* Icon */}
      <div className="mt-[3px] shrink-0">
        {channel.is_private ? (
          <Lock size={13} className="opacity-60" />
        ) : (
          <Hash size={13} className="opacity-60" />
        )}
      </div>

      {/* Name + preview */}
      <div className="min-w-0 flex-1 text-left overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("truncate font-medium", hasUnread && "font-semibold text-white")}>
            {channel.display_name}
          </span>
          {channel.is_muted && <BellOff size={9} className="shrink-0 opacity-35" />}
        </div>
        {channel.last_message?.text && (
          <p className="mt-0.5 text-[11px] leading-[1.35] opacity-55 line-clamp-1 break-words">
            {channel.last_message.text}
          </p>
        )}
      </div>

      {/* Right side: time + badge + menu */}
      <div className="shrink-0 flex flex-col items-end gap-1 ml-1">
        {channel.last_message?.created_at && (
          <span className="text-[10px] opacity-45 whitespace-nowrap">
            {formatMessageTime(channel.last_message.created_at)}
          </span>
        )}
        <div className="flex items-center gap-1">
          {hasUnread && (
            <span className="h-4 min-w-[16px] rounded-full bg-[hsl(239_84%_60%)] text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
              {channel.unread_count > 99 ? "99+" : channel.unread_count}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span
                role="button"
                aria-label="Channel actions"
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity",
                  "group-hover:opacity-60 hover:!opacity-100",
                  active && "opacity-50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={13} />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onSelect(channel)}>Open</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onMarkRead(channel.id)}>
                <CheckCircle2 size={14} className="mr-2 opacity-70" /> Mark read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onMarkUnread(channel)}>
                <BellRing size={14} className="mr-2 opacity-70" /> Mark unread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {channel.is_muted ? (
                <DropdownMenuItem onClick={() => void onUnmute(channel.id)}>
                  <Bell size={14} className="mr-2 opacity-70" /> Unmute
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => void onMute(channel.id, { minutes: 60 })}>
                    <BellOff size={14} className="mr-2 opacity-70" /> Mute 1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void onMute(channel.id, { forever: true })}>
                    <BellOff size={14} className="mr-2 opacity-70" /> Mute indefinitely
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </button>
  );
}

function DmRow({
  channel,
  active,
  onSelect,
  onlineUserIds,
  onMarkRead,
  onMarkUnread,
  onMute,
  onUnmute,
}: {
  channel: Channel;
  active: boolean;
  onSelect: (c: Channel) => void;
  onlineUserIds?: Set<string>;
  onMarkRead: (channelId: string) => void;
  onMarkUnread: (channel: Channel) => void;
  onMute: (channelId: string, input?: { minutes?: number; forever?: boolean }) => void;
  onUnmute: (channelId: string) => void;
}) {
  const online = channel.dm_other_user_id ? !!onlineUserIds?.has(channel.dm_other_user_id) : false;
  const hasUnread = channel.unread_count > 0 && !active && !channel.is_muted;
  return (
    <button
      onClick={() => onSelect(channel)}
      className={cn(
        "nav-item group w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] rounded-md",
        active && "active"
      )}
      style={{ whiteSpace: "normal", alignItems: "flex-start" }}
    >
      {/* Presence dot + icon */}
      <div className="relative mt-[3px] shrink-0">
        <User size={13} className="opacity-60" />
        <span className={cn(
          "absolute -right-1 -bottom-1 h-2 w-2 rounded-full ring-[1.5px] ring-[hsl(222_26%_12%)]",
          online ? "bg-emerald-500" : "bg-[hsl(220_10%_40%)]"
        )} />
      </div>

      {/* Name + preview */}
      <div className="min-w-0 flex-1 text-left overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("truncate font-medium", hasUnread && "font-semibold text-white")}>
            {channel.display_name}
          </span>
          {channel.is_muted && <BellOff size={9} className="shrink-0 opacity-35" />}
        </div>
        {channel.last_message?.text && (
          <p className="mt-0.5 text-[11px] leading-[1.35] opacity-55 line-clamp-1 break-words">
            {channel.last_message.text}
          </p>
        )}
      </div>

      {/* Right side: time + badge + menu */}
      <div className="shrink-0 flex flex-col items-end gap-1 ml-1">
        {channel.last_message?.created_at && (
          <span className="text-[10px] opacity-45 whitespace-nowrap">
            {formatMessageTime(channel.last_message.created_at)}
          </span>
        )}
        <div className="flex items-center gap-1">
          {hasUnread && (
            <span className="h-4 min-w-[16px] rounded-full bg-[hsl(239_84%_60%)] text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
              {channel.unread_count > 99 ? "99+" : channel.unread_count}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span
                role="button"
                aria-label="Conversation actions"
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity",
                  "group-hover:opacity-60 hover:!opacity-100",
                  active && "opacity-50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={13} />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onSelect(channel)}>Open</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onMarkRead(channel.id)}>
                <CheckCircle2 size={14} className="mr-2 opacity-70" /> Mark read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onMarkUnread(channel)}>
                <BellRing size={14} className="mr-2 opacity-70" /> Mark unread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {channel.is_muted ? (
                <DropdownMenuItem onClick={() => void onUnmute(channel.id)}>
                  <Bell size={14} className="mr-2 opacity-70" /> Unmute
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => void onMute(channel.id, { minutes: 60 })}>
                    <BellOff size={14} className="mr-2 opacity-70" /> Mute 1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void onMute(channel.id, { forever: true })}>
                    <BellOff size={14} className="mr-2 opacity-70" /> Mute indefinitely
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </button>
  );
}

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}
