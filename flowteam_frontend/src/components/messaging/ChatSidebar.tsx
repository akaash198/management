"use client";

import { Channel, SidebarViewType } from "@/types/messaging";
import { Bell, BellOff, BellRing, CheckCircle2, ChevronDown, ChevronRight, EyeOff, Hash, Inbox, Lock, MessageSquare, MessagesSquare, MoreHorizontal, Plus, Search, Star, User, AtSign, Pencil, LogOut, Archive, ArrowDownUp, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, normalizeUrl } from "@/lib/utils";
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
import { usePresenceStore } from "@/store/presence";

interface ChatSidebarProps {
  channels: Channel[];
  selectedId: string;
  activeView: SidebarViewType;
  onSelect: (channel: Channel) => void;
  onViewChange: (view: SidebarViewType) => void;
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
  channels, selectedId, activeView, onSelect, onViewChange, isLoading, teamId,
  onStartDirectMessage, onCreateChannel, onlineUserIds, onRefreshChannels,
}: ChatSidebarProps) {
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showMuted, setShowMuted] = useState(true);
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cowrk_starred') || '[]')); } catch { return new Set(); }
  });
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({ starred: true, channels: true, private: true, dm: true });
  const [sortMode, setSortMode] = useState<'recent' | 'alpha' | 'unread'>('recent');
  const [browseOpen, setBrowseOpen] = useState(false);
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
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const { customStatus, setCustomStatus } = usePresenceStore();
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

      if (sortMode === 'unread') {
        const aUnread = aMuted ? 0 : (a.unread_count || 0);
        const bUnread = bMuted ? 0 : (b.unread_count || 0);
        if (aUnread !== bUnread) return bUnread - aUnread;
      }

      if (sortMode === 'alpha') {
        const aName = (a.display_name || a.name || "").toLowerCase();
        const bName = (b.display_name || b.name || "").toLowerCase();
        return aName.localeCompare(bName);
      }

      // Default: recent
      const aLast = a.last_message?.created_at ? Date.parse(a.last_message.created_at) : 0;
      const bLast = b.last_message?.created_at ? Date.parse(b.last_message.created_at) : 0;
      if (aLast !== bLast) return bLast - aLast;

      const aName = (a.display_name || a.name || "").toLowerCase();
      const bName = (b.display_name || b.name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [channels, query, showMuted, unreadOnly, sortMode]);

  const publicChannels = useMemo(() => visible.filter((c) => !c.is_private && !starredIds.has(c.id)), [visible, starredIds]);
  const directMessages = useMemo(() => visible.filter((c) => isDmChannel(c) && !starredIds.has(c.id)), [visible, starredIds]);
  const privateChannels = useMemo(
    () => visible.filter((c) => c.is_private && !isDmChannel(c) && !isMeetingChannel(c) && !starredIds.has(c.id)),
    [visible, starredIds]
  );
  const starredChannels = useMemo(() => visible.filter((c) => starredIds.has(c.id)), [visible, starredIds]);

  const toggleStar = (channelId: string) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId); else next.add(channelId);
      localStorage.setItem('cowrk_starred', JSON.stringify([...next]));
      return next;
    });
  };

  const toggleSection = (key: string) => setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));

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

  const fetchAllChannels = async () => {
    if (!teamId) return;
    try {
      setBrowseLoading(true);
      const res = await api.get<ApiResponse<Channel[]>>(`/messaging/channels/`, { params: { team_id: teamId, all: true } });
      setAllChannels(res.data.data ?? []);
    } catch { setAllChannels([]); }
    finally { setBrowseLoading(false); }
  };

  useEffect(() => {
    if (browseOpen) fetchAllChannels();
  }, [browseOpen, teamId]);

  const joinChannel = async (id: string) => {
    try {
      await api.post(`/messaging/channels/${id}/join/`);
      toast.success("Joined channel");
      onRefreshChannels?.();
      setBrowseOpen(false);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to join channel"));
    }
  };

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

  const leaveChannel = async (channelId: string) => {
    try {
      await api.post(`/messaging/channels/${channelId}/leave/`);
      toast.success("Left channel");
      onRefreshChannels?.();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to leave channel"));
    }
  };

  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col border-r sidebar-shell">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-5 pb-5 space-y-4 sidebar-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Workspace Inbox</div>
            <h2 className="mt-1 text-[18px] font-black tracking-tight text-foreground">Messages</h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 text-muted-foreground transition-all"
                aria-label="New conversation"
              >
                <Plus size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border bg-popover/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => setDmOpen(true)} className="rounded-xl py-2.5">
                <MessageSquare size={16} className="mr-2 text-accent" />
                New direct message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-xl py-2.5"
                onClick={() => {
                  if (!onCreateChannel) { toast.error("Channel creation is not available"); return; }
                  setChannelOpen(true);
                }}
              >
                <Hash size={16} className="mr-2 text-violet-400" />
                New channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setStatusOpen(true)}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium transition-all hover:bg-muted/50 max-w-[180px] text-muted-foreground hover:text-foreground"
          >
            <span className="shrink-0">{customStatus?.emoji || "💬"}</span>
            <span className="truncate">{customStatus?.text || "Set status"}</span>
          </button>
        </div>

        <div className="relative group">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to conversation… (Ctrl+K)"
            className="h-10 w-full rounded-xl border border-border/50 bg-muted/20 pl-10 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                  unreadOnly
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-pressed={unreadOnly}
              >
                <CheckCircle2 size={11} />
                Unread
                {unreadTotal > 0 && (
                  <span className={cn(
                    "ml-0.5 rounded-full px-1.5 py-px text-[9px] font-bold",
                    unreadOnly ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground shadow-sm"
                  )}>
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </button>
          <button
            type="button"
            onClick={() => setShowMuted((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
              !showMuted
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-pressed={!showMuted}
            title={showMuted ? "Showing muted — click to hide" : "Hiding muted — click to show"}
          >
            <EyeOff size={11} />
            {showMuted ? "Muted" : "Muted"}
          </button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-all"
                title="Sort channels"
              >
                <ArrowDownUp size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-2 rounded-xl border-border bg-popover/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => setSortMode('recent')} className="rounded-lg">Most recent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('alpha')} className="rounded-lg">Alphabetical</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('unread')} className="rounded-lg">Most unread</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Channel list ── */}
      <ScrollArea className="flex-1 py-2">
        {/* ── Quick links ── */}
        <div className="mb-2 space-y-1 px-2">
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(true);
              onViewChange("unreads");
            }}
            className={cn(
              "group w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-xl transition-all duration-200",
              activeView === "unreads" 
                ? "bg-accent/15 text-accent font-bold" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Inbox size={15} className={cn(
              "shrink-0 transition-colors", 
              activeView === "unreads" ? "text-accent" : "text-muted-foreground/60 group-hover:text-foreground/70"
            )} />
            <span className="flex-1 text-left">All Unreads</span>
            {unreadTotal > 0 && (
              <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center px-1.5 leading-none shadow-glow-strong">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(false);
              onViewChange("threads");
            }}
            className={cn(
              "group w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-xl transition-all duration-200",
              activeView === "threads" 
                ? "bg-violet-500/15 text-violet-400 font-bold" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <MessagesSquare size={15} className={cn(
              "shrink-0 transition-colors", 
              activeView === "threads" ? "text-violet-400" : "text-muted-foreground/60 group-hover:text-foreground/70"
            )} />
            <span className="flex-1 text-left">Threads</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(false);
              onViewChange("drafts");
            }}
            className={cn(
              "group w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-xl transition-all duration-200",
              activeView === "drafts" 
                ? "bg-cyan-500/15 text-cyan-400 font-bold" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Pencil size={15} className={cn(
              "shrink-0 transition-colors", 
              activeView === "drafts" ? "text-cyan-400" : "text-muted-foreground/60 group-hover:text-foreground/70"
            )} />
            <span className="flex-1 text-left">Drafts &amp; Sent</span>
          </button>
        </div>

        <div className="mx-3 mb-2 h-px bg-border/50" />

        {/* ── Starred ── */}
        {starredChannels.length > 0 && (
          <>
            <SectionHeader label="Starred" sectionKey="starred" isOpen={sectionsOpen.starred} onToggle={toggleSection} icon={<Star size={10} className="text-amber-400" />} />
            {sectionsOpen.starred && (
              <div className="mb-3 space-y-0.5 px-2">
                {starredChannels.map((ch) => isDmChannel(ch) ? (
                  <DmRow key={ch.id} channel={ch} active={selectedId === ch.id} onSelect={onSelect} onlineUserIds={onlineUserIds} onMarkRead={markRead} onMarkUnread={markUnread} onMute={mute} onUnmute={unmute} starred onToggleStar={toggleStar} />
                ) : (
                  <ChannelRow key={ch.id} channel={ch} active={selectedId === ch.id} onSelect={onSelect} onMarkRead={markRead} onMarkUnread={markUnread} onMute={mute} onUnmute={unmute} starred onToggleStar={toggleStar} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Channels ── */}
        <SectionHeader label="Channels" sectionKey="channels" isOpen={sectionsOpen.channels} onToggle={toggleSection} onAdd={() => { if (onCreateChannel) setChannelOpen(true); else toast.error('Channel creation not available'); }} />
        {sectionsOpen.channels && (
          <div className="mb-3 space-y-0.5 px-2">
            {isLoading ? [1,2,3].map(i => <SkeletonRow key={i} />) : publicChannels.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] italic" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>No channels found.</p>
            ) : publicChannels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} active={selectedId === ch.id} onSelect={onSelect} onMarkRead={markRead} onMarkUnread={markUnread} onMute={mute} onUnmute={unmute} starred={starredIds.has(ch.id)} onToggleStar={toggleStar} onLeave={leaveChannel} />
            ))}
            {/* Browse all channels */}
            <button
              type="button"
              onClick={() => setBrowseOpen(true)}
              className="nav-item w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md opacity-60 hover:opacity-100"
            >
              <Compass size={12} /> Browse all channels
            </button>
          </div>
        )}

        {/* ── Private Channels ── */}
        <SectionHeader label="Private Channels" sectionKey="private" isOpen={sectionsOpen.private} onToggle={toggleSection} onAdd={() => { if (onCreateChannel) { setChannelPrivate(true); setChannelOpen(true); } }} />
        {sectionsOpen.private && (
          <div className="mb-3 space-y-0.5 px-2">
            {isLoading ? [1,2].map(i => <SkeletonRow key={`p-${i}`} />) : privateChannels.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] italic" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>No private channels yet.</p>
            ) : privateChannels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} active={selectedId === ch.id} onSelect={onSelect} onMarkRead={markRead} onMarkUnread={markUnread} onMute={mute} onUnmute={unmute} starred={starredIds.has(ch.id)} onToggleStar={toggleStar} />
            ))}
          </div>
        )}

        {/* ── Direct Messages ── */}
        <SectionHeader label="Direct Messages" sectionKey="dm" isOpen={sectionsOpen.dm} onToggle={toggleSection} onAdd={() => setDmOpen(true)} />
        {sectionsOpen.dm && (
          <div className="space-y-0.5 px-2 pb-3">
            {isLoading ? [1,2].map(i => <SkeletonRow key={i} />) : directMessages.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] italic" style={{ color: "hsl(var(--sidebar-fg-muted))" }}>No direct messages yet.</p>
            ) : directMessages.map((ch) => (
              <DmRow key={ch.id} channel={ch} active={selectedId === ch.id} onSelect={onSelect} onlineUserIds={onlineUserIds} onMarkRead={markRead} onMarkUnread={markUnread} onMute={mute} onUnmute={unmute} starred={starredIds.has(ch.id)} onToggleStar={toggleStar} />
            ))}
          </div>
        )}
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
      {/* ── Browse channels dialog ── */}
      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Browse channels</DialogTitle>
            <DialogDescription>Discover and join public channels in your workspace.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 max-h-[400px] overflow-auto rounded-xl border border-border">
            {browseLoading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading channels…</p>
            ) : allChannels.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No other channels found.</p>
            ) : (
              <div className="divide-y divide-border">
                {allChannels.map((c) => {
                  const isMember = channels.some(mine => mine.id === c.id);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1 mr-4">
                        <div className="flex items-center gap-1.5">
                          {c.is_private ? <Lock size={14} className="opacity-60" /> : <Hash size={14} className="opacity-60" />}
                          <span className="font-semibold text-[14px]">{c.display_name || c.name}</span>
                        </div>
                        {c.description && <p className="mt-1 text-[12px] text-muted-foreground line-clamp-1">{c.description}</p>}
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {c.member_count ?? 0} members
                        </p>
                      </div>
                      {isMember ? (
                        <Button variant="ghost" size="sm" disabled className="text-[11px] h-8">
                          Already joined
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => joinChannel(c.id)} className="text-[11px] h-8">
                          Join
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrowseOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Set a status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-xl">
                {customStatus?.emoji || "💬"}
              </div>
              <Input
                placeholder="What's your status?"
                defaultValue={customStatus?.text || ""}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const text = (e.target as HTMLInputElement).value;
                    setCustomStatus({ emoji: customStatus?.emoji || "💬", text, clearAt: null });
                    setStatusOpen(false);
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { e: "🏠", t: "Working remotely" },
                { e: "🤒", t: "Out sick" },
                { e: "🌴", t: "Vacationing" },
                { e: "🏃", t: "Commuting" },
                { e: "🍴", t: "On lunch" },
                { e: "📅", t: "In a meeting" },
              ].map(s => (
                <button
                  key={s.t}
                  className="rounded-full border border-border px-3 py-1 text-[12px] hover:bg-muted transition-colors"
                  onClick={() => setCustomStatus({ emoji: s.e, text: s.t, clearAt: null })}
                >
                  {s.e} {s.t}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCustomStatus(null); setStatusOpen(false); }}>Clear</Button>
            <Button onClick={() => setStatusOpen(false)}>Done</Button>
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

function SectionHeader({ label, sectionKey, isOpen, onToggle, onAdd, icon }: {
  label: string; sectionKey: string; isOpen: boolean;
  onToggle: (key: string) => void; onAdd?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="group/sec flex items-center px-3 pt-4 pb-1">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex flex-1 items-center gap-2 rounded px-1 py-0.5 text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 transition-colors hover:text-foreground/80"
      >
        <span className="shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown size={12} />
        </span>
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="h-6 w-6 flex items-center justify-center rounded-lg opacity-0 group-hover/sec:opacity-40 hover:!opacity-100 hover:bg-muted/50 transition-all text-muted-foreground/60"
          title={`Add to ${label}`}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function SkeletonRow() {
  return <div className="mx-1 h-[52px] rounded-xl animate-pulse mb-1 bg-muted/30" />;
}

function ChannelRow({
  channel,
  active,
  onSelect,
  onMarkRead,
  onMarkUnread,
  onMute,
  onUnmute,
  starred,
  onToggleStar,
  onLeave,
}: {
  channel: Channel;
  active: boolean;
  onSelect: (c: Channel) => void;
  onMarkRead: (channelId: string) => void;
  onMarkUnread: (channel: Channel) => void;
  onMute: (channelId: string, input?: { minutes?: number; forever?: boolean }) => void;
  onUnmute: (channelId: string) => void;
  starred?: boolean;
  onToggleStar?: (id: string) => void;
  onLeave?: (channelId: string) => void;
}) {
  const hasUnread = channel.unread_count > 0 && !active && !channel.is_muted;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(channel)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(channel);
        }
      }}
      className={cn(
        "group w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-xl transition-all duration-200 cursor-pointer outline-none",
        active 
          ? "bg-accent/15 text-accent font-bold" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      )}
      style={{ whiteSpace: "normal", alignItems: "flex-start" }}
    >
      {/* Icon */}
      <div className="mt-[3.5px] shrink-0">
        {channel.is_private ? (
          <Lock size={14} className={cn("transition-colors", active ? "text-accent" : "text-muted-foreground/50")} />
        ) : (
          <Hash size={14} className={cn("transition-colors", active ? "text-accent" : "text-muted-foreground/50")} />
        )}
      </div>

      {/* Name + preview */}
      <div className="min-w-0 flex-1 text-left overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("truncate font-medium transition-colors", active ? "text-accent" : hasUnread ? "font-bold text-foreground" : "text-muted-foreground/70")}>
            {channel.display_name}
          </span>
          {channel.is_muted && <BellOff size={10} className="shrink-0 text-muted-foreground/40" />}
        </div>
        {(() => {
          const msg = channel.last_message;
          if (!msg) return null;
          let preview = msg.text || "";
          if (!preview && msg.attachments?.length) preview = `📎 ${msg.attachments[0].filename ?? "Attachment"}`;
          // Suppress system message raw text (call logs stored as emoji strings or numbers); show human label instead.
          if (msg.is_system) {
            const event = (msg.meta as Record<string, unknown> | null)?.event as string | undefined;
            const callType = (msg.meta as Record<string, unknown> | null)?.call_type as string | undefined;
            const kind = callType === "video" ? "Video" : "Audio";
            if (event === "call_missed") preview = `📵 Missed ${kind.toLowerCase()} call`;
            else if (event === "call_ended") preview = `📞 ${kind} call ended`;
            else preview = preview || "System message";
          }
          if (!preview) return null;
          return (
            <p className={cn(
              "mt-1 text-[11.5px] leading-[1.4] line-clamp-1 break-words transition-colors",
              active ? "text-accent/60" : "text-muted-foreground/50"
            )}>
              {preview}
            </p>
          );
        })()}
      </div>

      {/* Right side: time + badge + menu */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 ml-1">
        {channel.last_message?.created_at && (
          <span className="text-[10px] font-medium text-muted-foreground/50 whitespace-nowrap">
            {formatMessageTime(channel.last_message.created_at)}
          </span>
        )}
        <div className="flex items-center gap-2">
          {hasUnread && (
            <span className="h-4.5 min-w-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center px-1 leading-none shadow-glow-strong">
              {channel.unread_count > 99 ? "99+" : channel.unread_count}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Channel actions"
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-lg opacity-0 transition-all",
                  "group-hover:opacity-40 hover:!opacity-100 hover:bg-muted/40",
                  active && "opacity-20"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} className="text-muted-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border bg-popover/95 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onSelect(channel)} className="rounded-xl py-2.5">Open Channel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleStar?.(channel.id)} className="rounded-xl py-2.5">
                <Star size={16} className={cn("mr-2", starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                {starred ? "Unstar" : "Star channel"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onMarkRead(channel.id)} className="rounded-xl py-2.5">
                <CheckCircle2 size={16} className="mr-2 text-green-500" /> Mark read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onMarkUnread(channel)} className="rounded-xl py-2.5">
                <BellRing size={16} className="mr-2 text-accent" /> Mark unread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {channel.is_muted ? (
                <DropdownMenuItem onClick={() => void onUnmute(channel.id)} className="rounded-xl py-2.5">
                  <Bell size={16} className="mr-2 text-accent" /> Unmute
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="rounded-xl py-2.5" onClick={(e) => e.stopPropagation()}>
                   <BellOff size={16} className="mr-2 text-muted-foreground/40" /> Mute...
                </DropdownMenuItem>
              )}
              {onLeave && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void onLeave(channel.id)} className="rounded-xl py-2.5 text-red-500 focus:text-red-500">
                    <LogOut size={16} className="mr-2 text-red-500" /> Leave channel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
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
  starred,
  onToggleStar,
}: {
  channel: Channel;
  active: boolean;
  onSelect: (c: Channel) => void;
  onlineUserIds?: Set<string>;
  onMarkRead: (channelId: string) => void;
  onMarkUnread: (channel: Channel) => void;
  onMute: (channelId: string, input?: { minutes?: number; forever?: boolean }) => void;
  onUnmute: (channelId: string) => void;
  starred?: boolean;
  onToggleStar?: (id: string) => void;
}) {
  const online = channel.dm_other_user_id ? !!onlineUserIds?.has(channel.dm_other_user_id) : false;
  const hasUnread = channel.unread_count > 0 && !active && !channel.is_muted;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(channel)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(channel);
        }
      }}
      className={cn(
        "group w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-xl transition-all duration-200 cursor-pointer outline-none",
        active 
          ? "bg-accent/15 text-accent font-bold" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      )}
      style={{ whiteSpace: "normal", alignItems: "flex-start" }}
    >
      {/* Avatar with presence */}
      <div className="relative shrink-0 mt-0.5">
        <Avatar className="h-7 w-7 border border-border/50">
          <AvatarImage src={normalizeUrl(channel.dm_other_avatar) || ""} />
          <AvatarFallback className="text-[10px] bg-accent/10 text-accent font-bold">
            {(channel.display_name?.[0] ?? "?").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
          online ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/30"
        )} />
      </div>

      {/* Name + preview */}
      <div className="min-w-0 flex-1 text-left overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("truncate font-medium transition-colors", active ? "text-accent" : hasUnread ? "font-bold text-foreground" : "text-muted-foreground/70")}>
            {channel.display_name}
          </span>
          {channel.is_muted && <BellOff size={10} className="shrink-0 text-muted-foreground/40" />}
        </div>
        {(() => {
          const msg = channel.last_message;
          if (!msg) return null;
          let preview = msg.text || "";
          if (!preview && msg.attachments?.length) preview = `📎 ${msg.attachments[0].filename ?? "Attachment"}`;
          // Suppress system message raw text (call logs stored as emoji strings or numbers); show human label instead.
          if (msg.is_system) {
            const event = (msg.meta as Record<string, unknown> | null)?.event as string | undefined;
            const callType = (msg.meta as Record<string, unknown> | null)?.call_type as string | undefined;
            const kind = callType === "video" ? "Video" : "Audio";
            if (event === "call_missed") preview = `📵 Missed ${kind.toLowerCase()} call`;
            else if (event === "call_ended") preview = `📞 ${kind} call ended`;
            else preview = preview || "System message";
          }
          if (!preview) return null;
          return (
            <p className={cn(
              "mt-1 text-[11.5px] leading-[1.4] line-clamp-1 break-words transition-colors",
              active ? "text-accent/60" : "text-muted-foreground/50"
            )}>
              {preview}
            </p>
          );
        })()}
      </div>

      {/* Right side: time + badge + menu */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 ml-1">
        {channel.last_message?.created_at && (
          <span className="text-[10px] font-medium text-muted-foreground/50 whitespace-nowrap">
            {formatMessageTime(channel.last_message.created_at)}
          </span>
        )}
        <div className="flex items-center gap-2">
          {hasUnread && (
            <span className="h-4.5 min-w-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center px-1 leading-none shadow-glow-strong">
              {channel.unread_count > 99 ? "99+" : channel.unread_count}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Conversation actions"
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-lg opacity-0 transition-all",
                  "group-hover:opacity-40 hover:!opacity-100 hover:bg-muted/40",
                  active && "opacity-20"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border bg-popover/95 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onSelect(channel)} className="rounded-xl py-2.5">Open Chat</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleStar?.(channel.id)} className="rounded-xl py-2.5">
                <Star size={16} className={cn("mr-2", starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                {starred ? "Unstar" : "Star conversation"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onMarkRead(channel.id)} className="rounded-xl py-2.5">
                <CheckCircle2 size={16} className="mr-2 text-green-500" /> Mark read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onMarkUnread(channel)} className="rounded-xl py-2.5">
                <BellRing size={16} className="mr-2 text-accent" /> Mark unread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {channel.is_muted ? (
                <DropdownMenuItem onClick={() => void onUnmute(channel.id)} className="rounded-xl py-2.5">
                  <Bell size={16} className="mr-2 text-accent" /> Unmute
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="rounded-xl py-2.5" onClick={(e) => e.stopPropagation()}>
                   <BellOff size={16} className="mr-2 text-muted-foreground/40" /> Mute...
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
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
