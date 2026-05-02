import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../src/components/AppText";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useChannels } from "../../src/lib/queries";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const channelColors: Array<readonly [string, string]> = [
  [colors.primaryDark, colors.primary],
  ["#1a3f8c", colors.blueLight],
  ["#4a2e8c", colors.violetLight],
  [colors.accent, colors.accentLight],
  [colors.teal, "#0ab3d8"],
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

export default function MessagesScreen() {
  const { activeTeamId, isDemoMode } = useAuthStore();
  const { data: channels = [] } = useChannels(isDemoMode, activeTeamId);
  const totalUnread = channels.reduce((s, c) => s + (c.unread_count ?? 0), 0);

  return (
    <Screen>
      <Header
        title="Messages"
        subtitle="Real-time team conversation"
        actionIcon="create-outline"
        badge={totalUnread}
      />

      {/* ── Online Members Strip ── */}
      <View style={styles.onlineRow}>
        {["YO", "MK", "AS", "JL", "RD"].map((initials, i) => (
          <View key={i} style={styles.onlineAvatarWrap}>
            <LinearGradient
              colors={channelColors[i % channelColors.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.onlineAvatar}
            >
              <AppText style={styles.onlineAvatarText}>{initials}</AppText>
            </LinearGradient>
            <View style={styles.onlineDot} />
          </View>
        ))}
        <View style={styles.onlineMore}>
          <AppText style={styles.onlineMoreText}>+8</AppText>
        </View>
      </View>

      {/* ── Channel list ── */}
      <View style={styles.list}>
        {channels.map((channel, index) => {
          const grad = channelColors[index % channelColors.length];
          const hasUnread = (channel.unread_count ?? 0) > 0;

          return (
            <Pressable
              key={channel.id}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/messages/[id]",
                  params: { id: channel.id, name: channel.name },
                })
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={[styles.channel, hasUnread && styles.channelUnread]}>
                {/* Avatar */}
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  <AppText style={styles.avatarText}>#</AppText>
                </LinearGradient>

                {/* Text */}
                <View style={styles.channelText}>
                  <View style={styles.channelTop}>
                    <AppText variant="bodyBold" numberOfLines={1} style={styles.channelName}>
                      {channel.name}
                    </AppText>
                    <AppText variant="caption" style={styles.timeText}>
                      {timeAgo(channel.last_message_at)}
                    </AppText>
                  </View>
                  <View style={styles.channelBottom}>
                    <AppText variant="caption" numberOfLines={1} style={styles.preview}>
                      {channel.last_message_text ?? "No recent messages"}
                    </AppText>
                    {hasUnread ? (
                      <View style={styles.badge}>
                        <AppText style={styles.badgeText}>{channel.unread_count}</AppText>
                      </View>
                    ) : (
                      <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                    )}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {/* ── Compose FAB hint ── */}
      <View style={styles.composeHint}>
        <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
        <AppText variant="micro" style={styles.composeHintText}>
          End-to-end encrypted messages
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Online strip
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: -6,
    marginBottom: spacing.md,
  },
  onlineAvatarWrap: {
    position: "relative",
    marginRight: 6,
  },
  onlineAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  onlineAvatarText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#3de8a0",
    borderWidth: 1.5,
    borderColor: colors.canvas,
  },
  onlineMore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.faint,
    borderWidth: 2,
    borderColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  onlineMoreText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  // Channels
  list: {
    gap: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  channel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 78,
    padding: spacing.sm + 4,
  },
  channelUnread: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySofter,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radius.md + 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 20,
    fontWeight: "900",
  },
  channelText: {
    flex: 1,
    gap: 4,
  },
  channelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  channelName: {
    flex: 1,
    letterSpacing: 0,
  },
  timeText: {
    color: colors.muted,
    fontSize: 11,
  },
  channelBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
    color: colors.muted,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "900",
  },

  // Footer hint
  composeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: spacing.lg,
    opacity: 0.55,
  },
  composeHintText: {
    color: colors.muted,
  },
});
