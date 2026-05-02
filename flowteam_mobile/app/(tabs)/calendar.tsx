import { StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../src/components/AppText";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useCalendarItems } from "../../src/lib/queries";
import { useAuthStore } from "../../src/store/authStore";

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const today = new Date();
const dayOfWeek = today.getDay(); // 0=Sun
const weekDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0

function getWeekDates() {
  const dates: number[] = [];
  const mon = new Date(today);
  mon.setDate(today.getDate() - weekDayIndex);
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    dates.push(d.getDate());
  }
  return dates;
}

const itemMeta: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  meeting: { icon: "videocam", color: colors.blue, bg: colors.blueSoft },
  task: { icon: "checkmark-circle", color: colors.primary, bg: colors.primarySoft },
  deadline: { icon: "flag", color: colors.danger, bg: colors.dangerSoft },
  event: { icon: "calendar", color: colors.violet, bg: colors.violetSoft },
};

export default function CalendarScreen() {
  const { activeTeamId, isDemoMode } = useAuthStore();
  const { data: items = [] } = useCalendarItems(isDemoMode, activeTeamId);
  const weekDates = getWeekDates();

  return (
    <Screen>
      <Header
        title="Agenda"
        subtitle="Tasks, meetings & events"
        actionIcon="add-circle-outline"
        secondaryIcon="options-outline"
      />

      {/* ── Week Strip ── */}
      <Card style={styles.weekCard}>
        <View style={styles.weekRow}>
          {weekDays.map((day, i) => {
            const isToday = i === weekDayIndex;
            return (
              <Pressable key={i} style={styles.dayCol}>
                <AppText style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                  {day}
                </AppText>
                {isToday ? (
                  <LinearGradient
                    colors={colors.gradPrimary}
                    style={styles.dayCircleActive}
                  >
                    <AppText style={styles.dayNumActive}>{weekDates[i]}</AppText>
                  </LinearGradient>
                ) : (
                  <View style={styles.dayCircle}>
                    <AppText style={styles.dayNum}>{weekDates[i]}</AppText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* ── Event count ── */}
      <View style={styles.countRow}>
        <AppText variant="heading">{items.length} events today</AppText>
        <View style={styles.syncRow}>
          <Ionicons name="sync-outline" size={14} color={colors.muted} />
          <AppText variant="caption">Synced</AppText>
        </View>
      </View>

      {/* ── Timeline ── */}
      <View style={styles.timeline}>
        {items.map((item, index) => {
          const kind = (item.kind ?? "task").toLowerCase();
          const meta = itemMeta[kind] ?? itemMeta.task;
          const isLast = index === items.length - 1;

          return (
            <View key={item.id} style={styles.row}>
              {/* Time col */}
              <View style={styles.timeCol}>
                <AppText style={styles.timeText}>{item.starts_at ?? "—"}</AppText>
              </View>

              {/* Spine */}
              <View style={styles.spineWrap}>
                <View style={[styles.spineNode, { backgroundColor: meta.color }]} />
                {!isLast && <View style={[styles.spineLine, { backgroundColor: meta.color + "44" }]} />}
              </View>

              {/* Card */}
              <Pressable
                style={({ pressed }) => [styles.cardWrap, pressed && styles.cardWrapPressed]}
              >
                <Card style={[styles.itemCard, { borderLeftColor: meta.color, borderLeftWidth: 3 }]}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.itemIconWrap, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <View style={styles.itemMeta}>
                      <AppText variant="micro" style={[styles.itemKind, { color: meta.color }]}>
                        {kind.toUpperCase()}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="bodyBold" style={styles.itemTitle}>{item.title}</AppText>
                  {item.due_date ? (
                    <View style={styles.itemDateRow}>
                      <Ionicons name="calendar-outline" size={11} color={colors.muted} />
                      <AppText variant="caption">{item.due_date}</AppText>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Week strip
  weekCard: {
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dayLabelActive: {
    color: colors.primary,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  dayNumActive: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.surface,
  },

  // Count row
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // Timeline
  timeline: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timeCol: {
    width: 48,
    paddingTop: spacing.md + 2,
    alignItems: "flex-end",
  },
  timeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  spineWrap: {
    width: 20,
    alignItems: "center",
  },
  spineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.md + 4,
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadow,
    shadowOpacity: 0.2,
  },
  spineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    borderRadius: 1,
  },
  cardWrap: {
    flex: 1,
  },
  cardWrapPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  itemCard: {
    padding: spacing.sm + 2,
    gap: 4,
    borderRadius: radius.md,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  itemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemMeta: {
    flex: 1,
  },
  itemKind: {
    letterSpacing: 0.8,
  },
  itemTitle: {
    letterSpacing: 0,
  },
  itemDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
