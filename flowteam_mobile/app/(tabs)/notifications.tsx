import { StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../src/components/AppText";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useNotifications } from "../../src/lib/queries";
import { useAuthStore } from "../../src/store/authStore";

const notifMeta: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  mention: { icon: "at", color: colors.violet, bg: colors.violetSoft },
  task: { icon: "checkmark-circle", color: colors.primary, bg: colors.primarySoft },
  deadline: { icon: "alarm", color: colors.danger, bg: colors.dangerSoft },
  message: { icon: "chatbubble", color: colors.blue, bg: colors.blueSoft },
  project: { icon: "layers", color: colors.accent, bg: colors.accentSoft },
};

function getNotifMeta(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("mention") || lower.includes("@")) return notifMeta.mention;
  if (lower.includes("task") || lower.includes("assigned")) return notifMeta.task;
  if (lower.includes("deadline") || lower.includes("due") || lower.includes("overdue")) return notifMeta.deadline;
  if (lower.includes("message") || lower.includes("channel")) return notifMeta.message;
  if (lower.includes("project")) return notifMeta.project;
  return notifMeta.task;
}

export default function NotificationsScreen() {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { data: notifications = [] } = useNotifications(isDemoMode);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Screen>
      <Header
        title="Alerts"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        actionIcon="options-outline"
        badge={unreadCount}
      />

      {/* ── Filter chips ── */}
      <View style={styles.filterRow}>
        {["All", "Unread", "Mentions", "Tasks"].map((label, i) => (
          <Pressable
            key={label}
            style={[styles.filterChip, i === 0 && styles.filterChipActive]}
          >
            <AppText
              style={[styles.filterChipText, i === 0 && styles.filterChipTextActive]}
            >
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {notifications.map((item) => {
          const meta = getNotifMeta(item.title);
          const isUnread = !item.is_read;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={[styles.item, isUnread && styles.itemUnread]}>
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={19} color={meta.color} />
                </View>

                {/* Content */}
                <View style={styles.textWrap}>
                  <View style={styles.itemTop}>
                    <AppText variant="bodyBold" numberOfLines={1} style={styles.itemTitle}>
                      {item.title}
                    </AppText>
                    {isUnread && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
                  </View>
                  <AppText variant="caption" numberOfLines={2}>
                    {item.body}
                  </AppText>
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={14} color={colors.line} />
              </Card>
            </Pressable>
          );
        })}
      </View>

      {notifications.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={32} color={colors.muted} />
          </View>
          <AppText variant="heading">All caught up</AppText>
          <AppText variant="caption" style={styles.emptySubtext}>
            No new notifications. Check back later.
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(103, 232, 249, 0.28)",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  list: {
    gap: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.sm + 4,
  },
  itemUnread: {
    borderColor: "rgba(103, 232, 249, 0.24)",
    backgroundColor: colors.primarySofter,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemTitle: {
    flex: 1,
    letterSpacing: 0,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.faint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    textAlign: "center",
    maxWidth: 220,
  },
});
