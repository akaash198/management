import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Avatar } from "../../src/components/Avatar";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { useMeetings } from "../../src/lib/queries";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";
import type { Meeting } from "../../src/lib/types";

function formatMeetingTime(str?: string): string {
  if (!str) return "—";
  try {
    const d = new Date(str);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today · ${time}`;
    if (isTomorrow) return `Tomorrow · ${time}`;
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
  } catch {
    return str;
  }
}

function minutesUntil(str?: string): number | null {
  if (!str) return null;
  try {
    return Math.round((new Date(str).getTime() - Date.now()) / 60000);
  } catch {
    return null;
  }
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const mins = minutesUntil(meeting.start_time ?? meeting.starts_at);
  const isCompleted = meeting.status === "completed";
  const isNow = mins !== null && mins >= -30 && mins <= 10;
  const isSoon = mins !== null && mins > 10 && mins <= 60;

  return (
    <Pressable style={({ pressed }) => [pressed && styles.cardPressed]}>
      <Card style={[styles.meetingCard, isNow && styles.meetingCardNow, isCompleted && styles.meetingCardDone]}>
        {/* Time badge */}
        <View style={styles.meetingTop}>
          <View style={[styles.timeBadge, isNow && styles.timeBadgeNow, isCompleted && styles.timeBadgeDone]}>
            <Ionicons
              name={isCompleted ? "checkmark-circle" : isNow ? "radio-button-on" : "calendar"}
              size={12}
              color={isCompleted ? colors.success : isNow ? colors.danger : colors.blue}
            />
            <AppText style={[styles.timeBadgeText, isNow && styles.timeBadgeTextNow, isCompleted && styles.timeBadgeTextDone]}>
              {isCompleted ? "Completed" : isNow ? "Starting soon" : isSoon ? `In ${mins}m` : formatMeetingTime(meeting.start_time ?? meeting.starts_at)}
            </AppText>
          </View>

          {meeting.has_recording ? (
            <View style={styles.recBadge}>
              <Ionicons name="videocam" size={10} color={colors.violet} />
              <AppText style={styles.recText}>Recording</AppText>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <AppText variant="heading" style={[styles.meetingTitle, isCompleted && styles.meetingTitleDone]} numberOfLines={2}>
          {meeting.title}
        </AppText>

        {/* Description */}
        {meeting.description ? (
          <AppText variant="caption" style={styles.meetingDesc} numberOfLines={2}>{meeting.description}</AppText>
        ) : null}

        {/* Footer */}
        <View style={styles.meetingFooter}>
          <View style={styles.attendeeRow}>
            <Ionicons name="people-outline" size={13} color={colors.muted} />
            <AppText variant="caption" style={styles.attendeeCount}>
              {meeting.attendee_count ?? (meeting.attendees?.length ?? 0)} attendees
            </AppText>
          </View>

          {!isCompleted ? (
            <Pressable style={styles.joinBtn}>
              <LinearGradient
                colors={isNow ? colors.gradDanger : colors.gradPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.joinBtnGrad}
              >
                <Ionicons name={isNow ? "videocam" : "calendar-outline"} size={13} color={colors.canvasDark} />
                <AppText style={styles.joinBtnText}>{isNow ? "Join now" : "View"}</AppText>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable style={styles.viewNotesBtn}>
              <Ionicons name="document-text-outline" size={13} color={colors.muted} />
              <AppText style={styles.viewNotesBtnText}>Notes</AppText>
            </Pressable>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

export default function MeetingsScreen() {
  const { isDemoMode, activeTeamId } = useAuthStore();
  const { data: meetings = [], isLoading, refetch } = useMeetings(isDemoMode, activeTeamId);
  const [refreshing, setRefreshing] = useState(false);

  const upcoming = meetings.filter((m) => m.status !== "completed");
  const past = meetings.filter((m) => m.status === "completed");

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
            title="Meetings"
            subtitle={`${upcoming.length} upcoming`}
            actionIcon="add-circle-outline"
            secondaryIcon="options-outline"
          />
        </View>

        {/* Quick join banner if meeting is starting soon */}
        {upcoming.some((m) => {
          const mins = minutesUntil(m.start_time ?? m.starts_at);
          return mins !== null && mins >= -5 && mins <= 5;
        }) ? (
          <LinearGradient
            colors={colors.gradDanger}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.liveBar}
          >
            <View style={styles.liveDot} />
            <AppText style={styles.liveText}>A meeting is starting now</AppText>
            <Pressable style={styles.liveJoin}>
              <AppText style={styles.liveJoinText}>Join</AppText>
              <Ionicons name="arrow-forward" size={13} color={colors.canvasDark} />
            </Pressable>
          </LinearGradient>
        ) : null}

        {/* Upcoming */}
        {upcoming.length === 0 && past.length === 0 && !isLoading ? (
          <EmptyState
            icon="videocam-outline"
            title="No meetings"
            subtitle="Scheduled meetings will appear here."
            actionLabel="Schedule meeting"
            iconColor={colors.blue}
          />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="label" style={styles.sectionLabel}>Upcoming</AppText>
                {upcoming.map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </View>
            ) : null}

            {past.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="label" style={styles.sectionLabel}>Past</AppText>
                {past.map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </View>
            ) : null}
          </>
        )}
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

  // Live bar
  liveBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    ...shadow,
    shadowOpacity: 0.2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  liveText: {
    flex: 1,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "800",
  },
  liveJoin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  liveJoinText: {
    color: colors.canvasDark,
    fontSize: 12,
    fontWeight: "900",
  },

  // Section
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    letterSpacing: 0.7,
    marginBottom: 2,
  },

  // Meeting card
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  meetingCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  meetingCardNow: {
    borderColor: "rgba(239,68,68,0.38)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  meetingCardDone: {
    opacity: 0.7,
  },
  meetingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blueSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
  },
  timeBadgeNow: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(239,68,68,0.28)",
  },
  timeBadgeDone: {
    backgroundColor: colors.successSoft,
    borderColor: "rgba(52,211,153,0.28)",
  },
  timeBadgeText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "800",
  },
  timeBadgeTextNow: {
    color: colors.danger,
  },
  timeBadgeTextDone: {
    color: colors.success,
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.violetSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.28)",
  },
  recText: {
    color: colors.violet,
    fontSize: 10,
    fontWeight: "800",
  },
  meetingTitle: {
    letterSpacing: 0,
  },
  meetingTitleDone: {
    color: colors.muted,
  },
  meetingDesc: {
    color: colors.inkLight,
    lineHeight: 18,
  },
  meetingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.lineSubtle,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attendeeCount: {
    color: colors.muted,
  },
  joinBtn: {
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  joinBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  joinBtnText: {
    color: colors.canvasDark,
    fontSize: 12,
    fontWeight: "900",
  },
  viewNotesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.faint,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  viewNotesBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
