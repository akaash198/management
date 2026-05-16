import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../src/components/AppText";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useMarkNotificationRead, useNotifications } from "../../src/lib/queries";
import { useAuthStore } from "../../src/store/authStore";

type Filter = "All" | "Unread" | "Mentions" | "Tasks";
const FILTERS: Filter[] = ["All", "Unread", "Mentions", "Tasks"];

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

function matchesFilter(title: string, isRead: boolean | undefined, filter: Filter): boolean {
  const lower = title.toLowerCase();
  switch (filter) {
    case "All": return true;
    case "Unread": return isRead !== true;
    case "Mentions": return lower.includes("mention") || lower.includes("@");
    case "Tasks": return lower.includes("task") || lower.includes("assigned") || lower.includes("deadline") || lower.includes("due");
  }
}

export default function NotificationsScreen() {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { data: notifications = [], refetch } = useNotifications(isDemoMode);
  const markRead = useMarkNotificationRead(isDemoMode);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = notifications.filter((n) => matchesFilter(n.title, n.is_read, activeFilter));

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.headerWrap}>
          <Header
            title="Alerts"
            subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
            actionIcon="options-outline"
            badge={unreadCount}
          />
        </View>

        <View style={styles.inner}>
          {/* Filter chips */}
          <View style={styles.filterRow}>
            {FILTERS.map((label) => (
              <Pressable
                key={label}
                onPress={() => setActiveFilter(label)}
                style={[styles.filterChip, activeFilter === label && styles.filterChipActive]}
              >
                <AppText style={[styles.filterChipText, activeFilter === label && styles.filterChipTextActive]}>
                  {label}
                </AppText>
              </Pressable>
            ))}
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon="notifications-off-outline"
              title="All caught up"
              subtitle={activeFilter === "Unread" ? "No unread notifications." : "No notifications here."}
              iconColor={colors.muted}
            />
          ) : (
            <View style={styles.list}>
              {filtered.map((item) => {
                const meta = getNotifMeta(item.title);
                const isUnread = !item.is_read;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (isUnread) markRead.mutate(item.id);
                    }}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Card style={[styles.item, isUnread && styles.itemUnread]}>
                      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={19} color={meta.color} />
                      </View>

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

                      <Ionicons name="chevron-forward" size={14} color={colors.line} />
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  inner: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
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
    borderColor: colors.glassBorderActive,
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
    borderColor: colors.glassBorderActive,
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
});
