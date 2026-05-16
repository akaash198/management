import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItem,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { useChannels } from "../../../src/lib/queries";
import { useChatSocket } from "../../../src/lib/useChatSocket";
import { colors, radius, spacing, typography } from "../../../src/lib/theme";
import type { Message } from "../../../src/lib/types";
import { useAuthStore } from "../../../src/store/authStore";

function formatTime(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const AVATAR_GRADS: string[][] = [
  [colors.primaryDark, colors.primary],
  ["#1a3f8c", colors.blue],
  ["#4a2e8c", colors.violet],
  [colors.teal, "#0ab3d8"],
  [colors.accent, colors.accentLight],
];

function avatarGrad(name?: string | null): string[] {
  if (!name) return AVATAR_GRADS[0];
  const idx = name.charCodeAt(0) % AVATAR_GRADS.length;
  return AVATAR_GRADS[idx];
}

export default function ChannelScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { activeTeamId, isDemoMode, user } = useAuthStore();
  const { data: channels = [] } = useChannels(isDemoMode, activeTeamId);
  const channel = channels.find((c) => c.id === id);

  const {
    messages,
    connectionState,
    reconnectNow,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    sendTyping,
    typingUsers,
    loadOlder,
    isLoadingOlder,
    hasMoreHistory,
  } = useChatSocket(id, { currentUser: user, isDemoMode });

  const [text, setText] = useState("");
  const listRef = useRef<FlatList<Message> | null>(null);
  const didInitialScrollRef = useRef(false);
  const atBottomRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return at - bt;
    });
  }, [messages]);

  const isConnected = connectionState === "connected";

  const renderItem: ListRenderItem<Message> = ({ item, index }) => {
    const mine = Boolean(user?.id && (item.sender_id === user.id || item.sender?.id === user.id));
    const prevMsg = sorted[index - 1];
    const prevSameUser = prevMsg && (prevMsg.sender_id === item.sender_id || prevMsg.sender?.id === item.sender?.id);
    const showAvatar = !mine && !prevSameUser;
    const showName = !mine && !prevSameUser;

    return (
      <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther, prevSameUser && styles.msgRowGrouped]}>
        {/* Avatar placeholder for alignment */}
        {!mine && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <LinearGradient
                colors={avatarGrad(item.sender?.full_name)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <AppText style={styles.avatarText}>{initials(item.sender?.full_name)}</AppText>
              </LinearGradient>
            ) : null}
          </View>
        )}

        <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
          {showName && (
            <AppText style={styles.senderName}>{item.sender?.full_name ?? "Member"}</AppText>
          )}

          <Pressable
            onLongPress={() => {
              if (item.is_deleted) return;
              const reactions = item.reactions ?? [];
              const hasThumb = reactions.some((r) => r.emoji === "👍" && r.reacted_by_me);
              const hasHeart = reactions.some((r) => r.emoji === "❤️" && r.reacted_by_me);
              const canEdit = mine && !item.pending && !item.failed;
              const canDelete = mine && !item.pending && !item.failed;
              const buttons: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }> = [
                { text: hasThumb ? "Remove 👍" : "React 👍", onPress: () => (hasThumb ? removeReaction(item.id, "👍") : addReaction(item.id, "👍")) },
                { text: hasHeart ? "Remove ❤️" : "React ❤️", onPress: () => (hasHeart ? removeReaction(item.id, "❤️") : addReaction(item.id, "❤️")) },
              ];
              if (canEdit) buttons.push({ text: "Edit", onPress: () => { setEditingId(item.id); setEditingText(item.text ?? ""); } });
              if (canDelete) buttons.push({ text: "Delete", style: "destructive", onPress: () => deleteMessage(item.id) });
              buttons.push({ text: "Cancel", style: "cancel" });
              const { Alert } = require("react-native") as typeof import("react-native");
              Alert.alert("Message", "Choose an action", buttons);
            }}
          >
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, item.pending && styles.bubblePending, item.failed && styles.bubbleFailed]}>
              {editingId === item.id ? (
                <View style={styles.editWrap}>
                  <TextInput
                    value={editingText}
                    onChangeText={setEditingText}
                    placeholder="Edit message…"
                    placeholderTextColor={colors.mutedLight}
                    style={[styles.editInput, mine && styles.editInputMine]}
                    multiline
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <Pressable
                      onPress={() => { setEditingId(null); setEditingText(""); }}
                      style={styles.editCancel}
                    >
                      <AppText style={styles.editCancelText}>Cancel</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const next = editingText.trim();
                        if (next) editMessage(item.id, next);
                        setEditingId(null);
                        setEditingText("");
                      }}
                      style={styles.editSave}
                    >
                      <AppText style={styles.editSaveText}>Save</AppText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {item.failed && (
                    <AppText style={styles.failedLabel}>Failed to send</AppText>
                  )}
                  <AppText style={[styles.msgText, mine ? styles.msgTextMine : styles.msgTextOther, item.is_deleted && styles.msgTextDeleted]}>
                    {item.is_deleted ? "This message was deleted" : item.text}
                  </AppText>
                  {item.reactions && item.reactions.length > 0 && (
                    <View style={styles.reactionsRow}>
                      {item.reactions.map((r) => (
                        <View key={r.emoji} style={[styles.reactionPill, r.reacted_by_me && styles.reactionPillActive]}>
                          <AppText style={[styles.reactionText, mine && styles.reactionTextMine]}>
                            {r.emoji} {r.count}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </Pressable>

          <View style={[styles.msgMeta, mine && styles.msgMetaMine]}>
            <AppText style={styles.msgTime}>{formatTime(item.created_at)}</AppText>
            {mine && !item.pending && !item.failed && (
              <Ionicons name="checkmark-done" size={12} color={colors.primary} />
            )}
            {item.pending && (
              <Ionicons name="time-outline" size={12} color={colors.muted} />
            )}
          </View>
        </View>
      </View>
    );
  };

  const canSend = text.trim().length > 0;

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const ok = sendMessage(trimmed);
    if (!ok) setText(trimmed);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    sendTyping(false);
  };

  const channelName = (channel?.name ?? name ?? id).toString();

  return (
    <View style={styles.root}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>

        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.channelIconWrap}
        >
          <AppText style={styles.channelIconText}>#</AppText>
        </LinearGradient>

        <View style={styles.channelInfo}>
          <AppText variant="bodyBold" style={styles.channelTitle} numberOfLines={1}>
            {channelName}
          </AppText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.presenceOnline : colors.presenceAway }]} />
            <AppText style={styles.statusText}>
              {isConnected ? "Connected" : connectionState === "connecting" ? "Connecting…" : "Disconnected"}
            </AppText>
          </View>
        </View>

        <Pressable onPress={() => reconnectNow()} style={styles.topAction} hitSlop={10}>
          <Ionicons name="refresh-outline" size={18} color={colors.muted} />
        </Pressable>
        <Pressable style={styles.topAction} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.listArea}>
          {sorted.length === 0 && connectionState === "connecting" ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="caption" style={styles.centerStateText}>Loading messages…</AppText>
            </View>
          ) : sorted.length === 0 ? (
            <View style={styles.centerState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.muted} />
              </View>
              <AppText variant="bodyBold" style={styles.emptyTitle}>Start the conversation</AppText>
              <AppText variant="caption" style={styles.emptySubtitle}>
                Say hello to the {channelName} channel.
              </AppText>
            </View>
          ) : (
            <FlatList
              ref={(node) => { listRef.current = node; }}
              data={sorted}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                atBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
                if (contentOffset.y < 60 && hasMoreHistory && !isLoadingOlder) void loadOlder();
              }}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                if (!didInitialScrollRef.current || atBottomRef.current) {
                  didInitialScrollRef.current = true;
                  listRef.current?.scrollToEnd({ animated: false });
                }
              }}
              onLayout={() => {
                if (!didInitialScrollRef.current) {
                  didInitialScrollRef.current = true;
                  listRef.current?.scrollToEnd({ animated: false });
                }
              }}
              refreshing={connectionState === "connecting"}
              onRefresh={() => reconnectNow()}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <View style={styles.typingRow}>
            <View style={styles.typingDots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.typingDot} />
              ))}
            </View>
            <AppText style={styles.typingText}>
              {Object.values(typingUsers).slice(0, 2).map((u) => u.name).join(", ")} typing…
            </AppText>
          </View>
        )}

        {/* ── Composer ── */}
        <View style={styles.composer}>
          <Pressable style={styles.composerAction}>
            <Ionicons name="add" size={20} color={colors.muted} />
          </Pressable>

          <View style={styles.inputWrap}>
            <TextInput
              value={text}
              onChangeText={(next) => {
                setText(next);
                sendTyping(next.trim().length > 0);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1700);
              }}
              placeholder={`Message #${channelName}`}
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <Pressable style={styles.emojiBtn}>
              <Ionicons name="happy-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => void send()}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
          >
            {canSend ? (
              <LinearGradient
                colors={[colors.primaryDark, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtnGrad}
              >
                <Ionicons name="send" size={17} color={colors.canvasDark} />
              </LinearGradient>
            ) : (
              <View style={styles.sendBtnGrad}>
                <Ionicons name="send" size={17} color={colors.muted} />
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: Platform.OS === "ios" ? 56 : spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.canvasMid,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderDark,
    gap: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  channelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  channelIconText: { color: "rgba(255,255,255,0.9)", fontSize: 18, fontWeight: "900" },
  channelInfo: { flex: 1, gap: 1 },
  channelTitle: { letterSpacing: 0 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  topAction: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },

  // Body
  body: { flex: 1 },
  listArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  // Center states
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  centerStateText: { color: colors.muted },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: { color: colors.ink },
  emptySubtitle: { color: colors.muted, textAlign: "center", maxWidth: 220 },

  // Messages
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    marginBottom: 2,
  },
  msgRowGrouped: { marginBottom: 1 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },

  avatarSlot: { width: 32, flexShrink: 0, alignItems: "center" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "rgba(255,255,255,0.95)", fontSize: 10, fontWeight: "900" },

  bubbleWrap: { maxWidth: "78%", gap: 2 },
  bubbleWrapMine: { alignItems: "flex-end" },

  senderName: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
    marginLeft: 2,
  },

  bubble: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderColor: "rgba(0,0,0,0.1)",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassBorderDark,
    borderBottomLeftRadius: 4,
  },
  bubblePending: { opacity: 0.65 },
  bubbleFailed: { borderColor: colors.danger },

  failedLabel: { color: colors.danger, fontSize: 10, fontWeight: "800", marginBottom: 2 },

  msgText: { ...typography.body },
  msgTextMine: { color: colors.canvasDark },
  msgTextOther: { color: colors.ink },
  msgTextDeleted: { fontStyle: "italic", opacity: 0.6 },

  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  reactionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  reactionPillActive: {
    backgroundColor: "rgba(0,0,0,0.15)",
    borderColor: "rgba(0,0,0,0.22)",
  },
  reactionText: { fontSize: 11, fontWeight: "700", color: colors.canvasDark },
  reactionTextMine: { color: colors.canvasDark },

  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 2,
    marginTop: 1,
  },
  msgMetaMine: { justifyContent: "flex-end", marginRight: 2 },
  msgTime: { color: colors.mutedLight, fontSize: 10, fontWeight: "600" },

  // Edit
  editWrap: { gap: spacing.xs },
  editInput: {
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: colors.ink,
    ...typography.body,
  },
  editInputMine: {
    color: colors.canvasDark,
    borderColor: "rgba(0,0,0,0.15)",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.xs },
  editCancel: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  editCancelText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  editSave: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  editSaveText: { color: colors.canvasDark, fontSize: 12, fontWeight: "800" },

  // Typing
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  typingDots: { flexDirection: "row", gap: 3 },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.muted,
    opacity: 0.6,
  },
  typingText: { color: colors.muted, fontSize: 11, fontWeight: "600" },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.sm,
    backgroundColor: colors.canvasMid,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderDark,
  },
  composerAction: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    flexShrink: 0,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    minHeight: 42,
  },
  input: {
    flex: 1,
    color: colors.ink,
    ...typography.body,
    maxHeight: 110,
    paddingVertical: Platform.OS === "ios" ? 0 : 2,
  },
  emojiBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    overflow: "hidden",
    flexShrink: 0,
  },
  sendBtnOff: { opacity: 0.4 },
  sendBtnGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
});
