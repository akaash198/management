import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Screen } from "../../src/components/Screen";
import { useChannels } from "../../src/lib/queries";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

const ONLINE_MEMBERS = [
  { initials: "SC", grad: [colors.primaryDark, colors.primary] as string[] },
  { initials: "AK", grad: ["#1a3f8c", colors.blueLight] as string[] },
  { initials: "MR", grad: ["#4a2e8c", colors.violetLight] as string[] },
  { initials: "JB", grad: [colors.teal, "#0ab3d8"] as string[] },
  { initials: "PR", grad: [colors.accent, colors.accentLight] as string[] },
];

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const CHANNEL_GRADS: string[][] = [
  [colors.primaryDark, colors.primary],
  ["#1a3f8c", colors.blue],
  ["#4a2e8c", colors.violet],
  [colors.teal, "#0ab3d8"],
  [colors.accent, colors.accentLight],
];

export default function MessagesScreen() {
  const { activeTeamId, isDemoMode } = useAuthStore();
  const { data: channels = [], refetch } = useChannels(isDemoMode, activeTeamId);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const totalUnread = channels.reduce((s, c) => s + (c.unread_count ?? 0), 0);
  const filtered = search.trim()
    ? channels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : channels;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <Screen scroll={false} noPadding>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandRow}>
              <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.brandDot} />
              <AppText variant="micro" style={styles.eyebrow}>FlowTeam</AppText>
            </View>
            <AppText variant="title" style={styles.title}>Messages</AppText>
            {totalUnread > 0 && (
              <View style={styles.unreadChip}>
                <AppText style={styles.unreadChipText}>{totalUnread} unread</AppText>
              </View>
            )}
          </View>
          <Pressable style={styles.composeBtn}>
            <Ionicons name="create-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search channels…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* ── Online strip ── */}
        {!search && (
          <View style={styles.onlineSection}>
            <AppText variant="label" style={styles.onlineLabel}>Online now</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineRow}>
              {ONLINE_MEMBERS.map((m, i) => (
                <View key={i} style={styles.onlineItem}>
                  <View style={styles.onlineAvatarWrap}>
                    <LinearGradient
                      colors={m.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.onlineAvatar}
                    >
                      <AppText style={styles.onlineAvatarText}>{m.initials}</AppText>
                    </LinearGradient>
                    <View style={styles.onlineDot} />
                  </View>
                </View>
              ))}
              <View style={styles.onlineItem}>
                <View style={[styles.onlineAvatar, styles.onlineMore]}>
                  <AppText style={styles.onlineMoreText}>+8</AppText>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Section label ── */}
        <View style={styles.sectionRow}>
          <AppText variant="label" style={styles.sectionLabel}>
            {search ? `Results · ${filtered.length}` : `Channels · ${channels.length}`}
          </AppText>
        </View>

        {/* ── Channel list ── */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={28} color={colors.muted} />
              <AppText variant="caption" style={styles.emptyText}>No channels found</AppText>
            </View>
          ) : (
            filtered.map((channel, index) => {
              const grad = CHANNEL_GRADS[index % CHANNEL_GRADS.length];
              const hasUnread = (channel.unread_count ?? 0) > 0;
              const ago = timeAgo(channel.last_message_at);

              return (
                <Pressable
                  key={channel.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/messages/[id]",
                      params: { id: channel.id, name: channel.name },
                    })
                  }
                  style={({ pressed }) => [styles.channelRow, pressed && styles.channelRowPressed]}
                >
                  {/* Avatar */}
                  <LinearGradient
                    colors={grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.channelAvatar}
                  >
                    <AppText style={styles.channelAvatarText}>#</AppText>
                  </LinearGradient>

                  {/* Content */}
                  <View style={styles.channelBody}>
                    <View style={styles.channelTop}>
                      <AppText
                        variant="bodyBold"
                        numberOfLines={1}
                        style={[styles.channelName, hasUnread && styles.channelNameUnread]}
                      >
                        {channel.name}
                      </AppText>
                      <AppText style={styles.timeText}>{ago}</AppText>
                    </View>
                    <View style={styles.channelBottom}>
                      <AppText variant="caption" numberOfLines={1} style={styles.preview}>
                        {channel.last_message_text ?? "No recent messages"}
                      </AppText>
                      {hasUnread ? (
                        <View style={styles.unreadBadge}>
                          <AppText style={styles.unreadBadgeText}>{channel.unread_count}</AppText>
                        </View>
                      ) : (
                        <Ionicons name="checkmark-done" size={15} color={colors.primary} />
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed-outline" size={11} color={colors.muted} />
          <AppText variant="micro" style={styles.footerText}>End-to-end encrypted</AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: { gap: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  brandDot: { width: 18, height: 3, borderRadius: 2 },
  eyebrow: { color: colors.primary, letterSpacing: 1.2 },
  title: { letterSpacing: 0, lineHeight: 34 },
  unreadChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.22)",
    marginTop: 2,
  },
  unreadChipText: { color: colors.danger, fontSize: 10, fontWeight: "800" },
  composeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    gap: spacing.xs,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 4,
  },

  // Online strip
  onlineSection: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  onlineLabel: { color: colors.muted, letterSpacing: 0.7, marginBottom: spacing.sm },
  onlineRow: { gap: spacing.sm, paddingBottom: 2 },
  onlineItem: {},
  onlineAvatarWrap: { position: "relative" },
  onlineAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  onlineAvatarText: { color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: "900" },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.presenceOnline,
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  onlineMore: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.glassBorderDark,
  },
  onlineMoreText: { color: colors.muted, fontSize: 11, fontWeight: "800" },

  // Section
  sectionRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: { color: colors.muted, letterSpacing: 0.7 },

  // Channel list
  list: { paddingHorizontal: spacing.md, gap: 2 },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  channelRowPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  channelAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  channelAvatarText: { color: "rgba(255,255,255,0.9)", fontSize: 22, fontWeight: "900" },
  channelBody: { flex: 1, gap: 4 },
  channelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  channelName: { flex: 1, color: colors.inkLight, letterSpacing: 0 },
  channelNameUnread: { color: colors.ink },
  timeText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  channelBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  preview: { flex: 1, color: colors.muted },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: colors.canvas, fontSize: 10, fontWeight: "900" },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: spacing.lg,
    opacity: 0.5,
  },
  footerText: { color: colors.muted },

  // Empty
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyText: { color: colors.muted },
});
