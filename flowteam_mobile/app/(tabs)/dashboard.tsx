import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../src/components/AppText";
import { Avatar } from "../../src/components/Avatar";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { PriorityBadge } from "../../src/components/PriorityBadge";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { TaskCreateModal } from "../../src/components/TaskCreateModal";
import { useMeetings, useNotifications, useProjects, useTasks } from "../../src/lib/queries";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardScreen() {
  const { user, activeTeamId, isDemoMode } = useAuthStore();
  const { data: projects = [], refetch: refetchProjects } = useProjects(isDemoMode, activeTeamId);
  const { data: tasks = [], refetch: refetchTasks } = useTasks(isDemoMode);
  const { data: notifications = [] } = useNotifications(isDemoMode);
  const { data: meetings = [] } = useMeetings(isDemoMode, activeTeamId);

  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const openTasks = tasks.filter((task) => !task.column_name?.toLowerCase().includes("done") && task.status !== "done").length;
  const doneTasks = tasks.filter((task) => task.column_name?.toLowerCase().includes("done") || task.status === "done").length;
  const overdueTasks = tasks.filter((task) => task.is_overdue || (task.due_date && new Date(task.due_date) < new Date() && task.status !== "done")).length;
  const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const nextMeeting = meetings.find((m) => m.status !== "completed");

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchTasks()]);
    setRefreshing(false);
  };

  const quickActions = [
    {
      label: "New task",
      icon: "add-circle" as const,
      color: colors.primary,
      bg: colors.primarySoft,
      border: colors.glassBorderActive,
      onPress: () => setShowCreate(true),
    },
    {
      label: "My tasks",
      icon: "checkbox" as const,
      color: colors.blueLight,
      bg: colors.blueSoft,
      border: "rgba(96, 165, 250, 0.24)",
      onPress: () => router.push("/my-tasks"),
    },
    {
      label: "AI recap",
      icon: "sparkles" as const,
      color: colors.accent,
      bg: colors.accentSoft,
      border: "rgba(56, 189, 248, 0.24)",
      onPress: () => {},
    },
  ];

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
        <Header
          title={getGreeting()}
          subtitle={`Welcome back, ${firstName}`}
          actionIcon="search-outline"
          onAction={() => router.push("/search")}
          secondaryIcon={unreadNotifications > 0 ? "notifications" : "notifications-outline"}
          onSecondaryAction={() => router.push("/(tabs)/notifications")}
          badge={unreadNotifications}
        />

        {/* AI Briefing card */}
        <LinearGradient
          colors={colors.gradHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.briefing}
        >
          <View style={styles.briefingAccent} />
          <View style={styles.briefingTop}>
            <View style={styles.aiChip}>
              <Ionicons name="sparkles" size={11} color={colors.primary} />
              <AppText style={styles.aiChipText}>AI Briefing</AppText>
            </View>
            <View style={overdueTasks > 0 ? styles.atRiskPill : styles.onTrackPill}>
              <View style={[styles.statusDot, { backgroundColor: overdueTasks > 0 ? colors.danger : colors.success }]} />
              <AppText style={[styles.statusText, { color: overdueTasks > 0 ? colors.danger : colors.success }]}>
                {overdueTasks > 0 ? `${overdueTasks} overdue` : "On track"}
              </AppText>
            </View>
          </View>

          <AppText style={styles.briefingTitle}>
            {openTasks > 0 ? "Focus on open work first." : "All tasks complete!"}
          </AppText>
          <AppText style={styles.briefingBody}>
            {openTasks} open task{openTasks !== 1 ? "s" : ""} need attention
            {nextMeeting ? ` · ${nextMeeting.title} coming up` : ""}.
          </AppText>

          <View style={styles.briefingProgress}>
            <View style={styles.briefingProgressTrack}>
              <LinearGradient
                colors={colors.gradPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.briefingProgressFill, { width: `${pct}%` }]}
              />
            </View>
            <AppText style={styles.briefingProgressLabel}>{pct}% complete today</AppText>
          </View>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Pressable style={[styles.statCard, { borderLeftColor: colors.primary }]} onPress={() => router.push("/(tabs)/projects")}>
            <AppText style={styles.statNumber}>{projects.length}</AppText>
            <AppText variant="caption" style={styles.statLabel}>Projects</AppText>
          </Pressable>
          <Pressable style={[styles.statCard, { borderLeftColor: colors.blue }]} onPress={() => router.push("/my-tasks")}>
            <AppText style={styles.statNumber}>{openTasks}</AppText>
            <AppText variant="caption" style={styles.statLabel}>Open tasks</AppText>
          </Pressable>
          <Pressable style={[styles.statCard, { borderLeftColor: overdueTasks > 0 ? colors.danger : colors.success }]}>
            <AppText style={[styles.statNumber, overdueTasks > 0 && styles.statNumberDanger]}>{overdueTasks > 0 ? overdueTasks : doneTasks}</AppText>
            <AppText variant="caption" style={styles.statLabel}>{overdueTasks > 0 ? "Overdue" : "Completed"}</AppText>
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: a.bg, borderColor: a.border },
                pressed && styles.actionBtnPressed,
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.color }]}>
                <Ionicons name={a.icon} size={15} color={colors.canvasDark} />
              </View>
              <AppText style={[styles.actionLabel, { color: a.color }]}>{a.label}</AppText>
            </Pressable>
          ))}
        </View>

        {/* Priority tasks */}
        <View style={styles.sectionHeader}>
          <AppText variant="heading">Priority tasks</AppText>
          <Pressable style={styles.viewAllBtn} onPress={() => router.push("/my-tasks")}>
            <AppText style={styles.viewAllText}>View all</AppText>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.taskList}>
          {tasks.slice(0, 4).map((task, index) => {
            const assigneeName = task.assignee?.full_name ?? task.assignee_name ?? "Unassigned";
            const railColor = [colors.danger, colors.accent, colors.blue, colors.primary][index] ?? colors.primary;
            return (
              <Pressable
                key={task.id}
                onPress={() => router.push(`/tasks/${task.id}`)}
                style={({ pressed }) => [pressed && styles.taskPressed]}
              >
                <Card style={styles.taskCard}>
                  <View style={[styles.taskRail, { backgroundColor: railColor }]} />
                  <View style={styles.taskContent}>
                    <View style={styles.taskTop}>
                      <AppText variant="bodyBold" numberOfLines={1} style={styles.taskTitle}>
                        {task.title}
                      </AppText>
                      <PriorityBadge priority={task.priority} compact />
                    </View>
                    <View style={styles.taskMeta}>
                      <View style={styles.assigneeRow}>
                        <Avatar name={assigneeName} size={18} />
                        <AppText variant="caption">{assigneeName}</AppText>
                      </View>
                      {task.due_date ? (
                        <View style={styles.dueDateRow}>
                          <Ionicons name="time-outline" size={11} color={colors.muted} />
                          <AppText variant="caption">{task.due_date}</AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {tasks.length === 0 ? (
            <Card style={styles.emptyTaskCard}>
              <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.success} />
              <AppText variant="caption" style={styles.emptyTaskText}>All caught up! No open tasks.</AppText>
            </Card>
          ) : null}
        </View>

        {/* Active projects */}
        {projects.length > 0 ? (
          <>
            <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
              <AppText variant="heading">Active projects</AppText>
              <Pressable style={styles.viewAllBtn} onPress={() => router.push("/(tabs)/projects")}>
                <AppText style={styles.viewAllText}>View all</AppText>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.projectStrip}>
              {projects.slice(0, 3).map((p) => {
                const projectProgress = p.task_count ? Math.round(((p.completed_task_count ?? 0) / p.task_count) * 100) : (p.progress ?? 0);
                const accent = p.color ?? colors.primary;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/projects/${p.id}`)}
                    style={({ pressed }) => [styles.projectChip, pressed && { opacity: 0.76 }]}
                  >
                    <View style={[styles.projectChipInner, { borderColor: accent + "44" }]}>
                      <View style={[styles.projectChipAccent, { backgroundColor: accent }]} />
                      <Ionicons name="layers-outline" size={16} color={accent} />
                      <AppText style={styles.projectChipName} numberOfLines={1}>{p.name}</AppText>
                      <View style={[styles.projectChipPct, { backgroundColor: accent + "20" }]}>
                        <AppText style={[styles.projectChipPctText, { color: accent }]}>{projectProgress}%</AppText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Quick nav pills */}
        <View style={styles.navPillsRow}>
          <Pressable style={styles.navPill} onPress={() => router.push("/team")}>
            <Ionicons name="people-outline" size={15} color={colors.violet} />
            <AppText style={[styles.navPillText, { color: colors.violet }]}>Team</AppText>
          </Pressable>
          <Pressable style={styles.navPill} onPress={() => router.push("/(tabs)/meetings")}>
            <Ionicons name="videocam-outline" size={15} color={colors.blue} />
            <AppText style={[styles.navPillText, { color: colors.blue }]}>Meetings</AppText>
          </Pressable>
          <Pressable style={styles.navPill} onPress={() => router.push("/(tabs)/calendar")}>
            <Ionicons name="calendar-outline" size={15} color={colors.teal} />
            <AppText style={[styles.navPillText, { color: colors.teal }]}>Calendar</AppText>
          </Pressable>
          <Pressable style={styles.navPill} onPress={() => router.push("/search")}>
            <Ionicons name="search-outline" size={15} color={colors.accent} />
            <AppText style={[styles.navPillText, { color: colors.accent }]}>Search</AppText>
          </Pressable>
        </View>
      </ScrollView>

      <TaskCreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        isDemoMode={isDemoMode}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.xs,
  },

  briefing: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    minHeight: 198,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    ...shadow,
    shadowOpacity: 0.22,
    marginTop: spacing.sm,
  },
  briefingAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  briefingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  aiChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  onTrackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.25)",
  },
  atRiskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.25)",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  briefingTitle: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  briefingBody: {
    color: colors.inkLight,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  briefingProgress: {
    gap: 6,
    marginTop: spacing.xs,
  },
  briefingProgressTrack: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  briefingProgressFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  briefingProgressLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    borderLeftWidth: 3,
    padding: spacing.md,
    gap: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: 0,
  },
  statNumberDanger: {
    color: colors.danger,
  },
  statLabel: {
    color: colors.muted,
  },

  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: "center",
    gap: 6,
    minHeight: 72,
    justifyContent: "center",
  },
  actionBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  taskList: {
    gap: spacing.xs,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    padding: 0,
    overflow: "hidden",
  },
  taskRail: {
    width: 3.5,
    alignSelf: "stretch",
  },
  taskContent: {
    flex: 1,
    padding: spacing.md,
    gap: 6,
  },
  taskTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  taskTitle: {
    flex: 1,
    letterSpacing: 0,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  taskPressed: {
    opacity: 0.88,
  },
  emptyTaskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  emptyTaskText: {
    color: colors.muted,
    flex: 1,
  },

  projectStrip: {
    gap: spacing.sm,
  },
  projectChip: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  projectChipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  projectChipAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  projectChipName: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    paddingLeft: 3,
  },
  projectChipPct: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  projectChipPctText: {
    fontSize: 11,
    fontWeight: "900",
  },

  navPillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  navPill: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  navPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
