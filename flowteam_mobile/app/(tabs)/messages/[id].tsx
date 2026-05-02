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
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { Card } from "../../../src/components/Card";
import { Header } from "../../../src/components/Header";
import { Screen } from "../../../src/components/Screen";
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
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
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

  const renderItem: ListRenderItem<Message> = ({ item }) => {
    const mine = Boolean(user?.id && (item.sender_id === user.id || item.sender?.id === user.id));
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        {!mine ? (
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initials(item.sender?.full_name)}</AppText>
          </View>
        ) : null}
        <Pressable
          onLongPress={() => {
            if (item.is_deleted) return;
            const reactions = item.reactions ?? [];
            const hasThumb = reactions.some((r) => r.emoji === "👍" && r.reacted_by_me);
            const hasHeart = reactions.some((r) => r.emoji === "❤️" && r.reacted_by_me);
            const canEdit = mine && !item.pending && !item.failed;
            const canDelete = mine && !item.pending && !item.failed;

            const buttons: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }> = [
              {
                text: hasThumb ? "Remove 👍" : "React 👍",
                onPress: () => (hasThumb ? removeReaction(item.id, "👍") : addReaction(item.id, "👍")),
              },
              {
                text: hasHeart ? "Remove ❤️" : "React ❤️",
                onPress: () => (hasHeart ? removeReaction(item.id, "❤️") : addReaction(item.id, "❤️")),
              },
            ];
            if (canEdit) {
              buttons.push({
                text: "Edit",
                onPress: () => {
                  setEditingId(item.id);
                  setEditingText(item.text ?? "");
                },
              });
            }
            if (canDelete) {
              buttons.push({
                text: "Delete",
                style: "destructive",
                onPress: () => deleteMessage(item.id),
              });
            }
            buttons.push({ text: "Cancel", style: "cancel" });
            // Lazy import to avoid bundling costs in some builds
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { Alert } = require("react-native") as typeof import("react-native");
            Alert.alert("Message", "Choose an action", buttons);
          }}
        >
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {!mine ? (
            <AppText numberOfLines={1} style={styles.senderName}>
              {item.sender?.full_name ?? "Member"}
            </AppText>
          ) : null}
          {editingId === item.id ? (
            <View style={styles.editWrap}>
              <TextInput
                value={editingText}
                onChangeText={setEditingText}
                placeholder="Edit message…"
                placeholderTextColor={colors.mutedLight}
                style={styles.editInput}
                multiline
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => {
                    setEditingId(null);
                    setEditingText("");
                  }}
                  style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
                >
                  <AppText style={styles.editBtnText}>Cancel</AppText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const next = editingText.trim();
                    if (next) editMessage(item.id, next);
                    setEditingId(null);
                    setEditingText("");
                  }}
                  style={({ pressed }) => [styles.editBtn, styles.editBtnPrimary, pressed && styles.editBtnPressed]}
                >
                  <AppText style={[styles.editBtnText, styles.editBtnTextPrimary]}>Save</AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {item.failed ? (
                <AppText style={styles.failedText}>Not sent — tap to retry</AppText>
              ) : null}
              <AppText style={[styles.messageText, mine ? styles.messageTextMine : styles.messageTextOther]}>
                {item.is_deleted ? "This message was deleted" : item.text}
              </AppText>
              {item.reactions && item.reactions.length > 0 ? (
                <View style={styles.reactionsRow}>
                  {item.reactions.map((r) => (
                    <View key={r.emoji} style={[styles.reactionPill, r.reacted_by_me && styles.reactionPillActive]}>
                      <AppText style={styles.reactionText}>
                        {r.emoji} {r.count}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
          <AppText style={[styles.time, mine ? styles.timeMine : styles.timeOther]}>
            {formatTime(item.created_at)}
          </AppText>
          </View>
        </Pressable>
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

  return (
    <Screen scroll={false} noPadding>
      <View style={styles.container}>
        <View style={styles.headerPad}>
          <Header
            title={`#${(channel?.name ?? name ?? id).toString()}`}
            subtitle={connectionState === "connected" ? "Messages" : connectionState}
            actionIcon="arrow-back"
            onAction={() => router.back()}
            secondaryIcon={connectionState === "error" ? "refresh" : "refresh"}
            onSecondaryAction={() => reconnectNow()}
          />
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
        >
          <View style={styles.listWrap}>
            {sorted.length === 0 && connectionState === "connecting" ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <AppText variant="caption" style={styles.loadingText}>
                  Loading messages…
                </AppText>
              </View>
            ) : sorted.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={22} color={colors.muted} />
                <AppText variant="caption" style={styles.emptyTitle}>
                  No messages yet
                </AppText>
                <AppText variant="caption" style={styles.emptySubtitle}>
                  Start the conversation with your team.
                </AppText>
              </View>
            ) : (
              <FlatList
                ref={(node) => {
                  listRef.current = node;
                }}
                data={sorted}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                  const paddingToBottom = 80;
                  atBottomRef.current =
                    layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
                  if (contentOffset.y < 60 && hasMoreHistory && !isLoadingOlder) {
                    void loadOlder();
                  }
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

          {Object.keys(typingUsers).length > 0 ? (
            <View style={styles.typingRow}>
              <AppText variant="caption" style={styles.typingText}>
                {Object.values(typingUsers)
                  .slice(0, 2)
                  .map((u) => u.name)
                  .join(", ")}{" "}
                typing…
              </AppText>
            </View>
          ) : null}

          <Card style={styles.composer} elevated>
            <View style={styles.composerRow}>
              <TextInput
                value={text}
                onChangeText={(next) => {
                  setText(next);
                  sendTyping(next.trim().length > 0);
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    sendTyping(false);
                  }, 1700);
                }}
                placeholder="Message…"
                placeholderTextColor={colors.mutedLight}
                style={styles.input}
                multiline
                maxLength={2000}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => void send()}
                disabled={!canSend}
                style={({ pressed }) => [
                  styles.sendBtn,
                  !canSend && styles.sendBtnDisabled,
                  pressed && canSend ? styles.sendBtnPressed : null,
                ]}
              >
                <Ionicons name="send" size={18} color={colors.canvasDark} />
              </Pressable>
            </View>
            <View style={styles.composerMeta}>
              <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
              <AppText variant="micro" style={styles.metaText}>
                Encrypted
              </AppText>
            </View>
          </Card>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  headerPad: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  listWrap: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    backgroundColor: colors.surfaceGlass,
    overflow: "hidden",
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.muted,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.inkLight,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: colors.muted,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderColor: "rgba(0,0,0,0.12)",
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassBorderDark,
    borderBottomLeftRadius: 6,
  },
  senderName: {
    color: colors.inkLight,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  messageText: {
    ...typography.body,
  },
  messageTextMine: {
    color: colors.canvasDark,
  },
  messageTextOther: {
    color: colors.ink,
  },
  failedText: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  reactionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  reactionPillActive: {
    borderColor: "rgba(0,0,0,0.18)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  reactionText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.canvasDark,
  },
  time: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
  },
  timeMine: {
    color: "rgba(0,0,0,0.55)",
    textAlign: "right",
  },
  timeOther: {
    color: colors.muted,
    textAlign: "right",
  },
  composer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    backgroundColor: colors.surfaceGlass,
    color: colors.ink,
    ...typography.body,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.14)",
  },
  sendBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  composerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    opacity: 0.7,
    paddingTop: 2,
  },
  metaText: {
    color: colors.muted,
  },
  typingRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    opacity: 0.8,
  },
  typingText: {
    color: colors.muted,
  },
  editWrap: {
    gap: spacing.xs,
  },
  editInput: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: colors.ink,
    ...typography.body,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    backgroundColor: colors.surfaceGlass,
  },
  editBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: "rgba(0,0,0,0.14)",
  },
  editBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
  },
  editBtnTextPrimary: {
    color: colors.canvasDark,
  },
});
