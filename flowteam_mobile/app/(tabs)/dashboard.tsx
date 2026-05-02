import { StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../src/components/AppText";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useProjects, useTasks } from "../../src/lib/queries";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

const quickActions = [
  { label: "New task", icon: "add-circle", color: colors.primary, bg: colors.primarySoft, border: "rgba(103, 232, 249, 0.24)" },
  { label: "Start call", icon: "videocam", color: colors.blueLight, bg: colors.blueSoft, border: "rgba(96, 165, 250, 0.24)" },
  { label: "AI recap", icon: "sparkles", color: colors.accent, bg: colors.accentSoft, border: "rgba(249, 115, 22, 0.24)" },
] as const;

export default function DashboardScreen() {
  const { user, activeTeamId, isDemoMode } = useAuthStore();
  const { data: projects = [] } = useProjects(isDemoMode, activeTeamId);
  const { data: tasks = [] } = useTasks(isDemoMode);
  const openTasks = tasks.filter((task) => !task.column_name?.toLowerCase().includes("done")).length;
  const doneTasks = tasks.filter((task) => task.column_name?.toLowerCase().includes("done")).length;
  const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  return (
    <Screen>
      <Header
        title="Good morning"
        subtitle={`Welcome back, ${firstName}`}
        actionIcon="search-outline"
        secondaryIcon="notifications-outline"
      />

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
          <View style={styles.onTrackPill}>
            <View style={styles.onTrackDot} />
            <AppText style={styles.onTrackText}>On track</AppText>
          </View>
        </View>

        <AppText style={styles.briefingTitle}>Focus on review work first.</AppText>
        <AppText style={styles.briefingBody}>
          {openTasks} open tasks need attention. Highest-risk item is mobile navigation.
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
          <AppText style={styles.briefingProgressLabel}>{pct}% done today</AppText>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <AppText style={styles.statNumber}>{projects.length}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Projects</AppText>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.blue }]}>
          <AppText style={styles.statNumber}>{openTasks}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Open tasks</AppText>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <AppText style={styles.statNumber}>{doneTasks}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Completed</AppText>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {quickActions.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: a.bg, borderColor: a.border },
              pressed && styles.actionBtnPressed,
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.color }]}>
              <Ionicons name={a.icon as any} size={15} color={colors.canvasDark} />
            </View>
            <AppText style={[styles.actionLabel, { color: a.color }]}>{a.label}</AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="heading">Priority tasks</AppText>
        <Pressable style={styles.viewAllBtn} onPress={() => router.push("/(tabs)/projects")}>
          <AppText style={styles.viewAllText}>View all</AppText>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.taskList}>
        {tasks.slice(0, 4).map((task, index) => {
          const assigneeName = task.assignee?.full_name ?? task.assignee_name ?? "Unassigned";
          const railColor = [colors.danger, colors.accent, colors.blue, colors.primary][index] ?? colors.primary;
          return (
            <Pressable key={task.id} style={({ pressed }) => [pressed && styles.taskPressed]}>
              <Card style={styles.taskCard}>
                <View style={[styles.taskRail, { backgroundColor: railColor }]} />
                <View style={styles.taskContent}>
                  <View style={styles.taskTop}>
                    <AppText variant="bodyBold" numberOfLines={1} style={styles.taskTitle}>
                      {task.title}
                    </AppText>
                    <StatusPill label={task.priority ?? task.column_name ?? task.status ?? "todo"} />
                  </View>
                  <View style={styles.taskMeta}>
                    <View style={styles.assigneeRow}>
                      <View style={styles.avatarMini}>
                        <AppText style={styles.avatarMiniText}>{assigneeName[0].toUpperCase()}</AppText>
                      </View>
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
      </View>

      {projects.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
            <AppText variant="heading">Active projects</AppText>
          </View>
          <View style={styles.projectStrip}>
            {projects.slice(0, 3).map((p) => {
              const projectProgress = p.task_count ? Math.round(((p.completed_task_count ?? 0) / p.task_count) * 100) : (p.progress ?? 0);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/projects/${p.id}`)}
                  style={({ pressed }) => [styles.projectChip, pressed && { opacity: 0.76 }]}
                >
                  <View style={styles.projectChipInner}>
                    <Ionicons name="layers-outline" size={16} color={colors.primary} />
                    <AppText style={styles.projectChipName} numberOfLines={1}>{p.name}</AppText>
                    <View style={styles.projectChipPct}>
                      <AppText style={styles.projectChipPctText}>{projectProgress}%</AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  onTrackDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  onTrackText: {
    color: colors.success,
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
  avatarMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  taskPressed: {
    opacity: 0.88,
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
    borderColor: colors.glassBorderDark,
    borderRadius: radius.md,
  },
  projectChipName: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
  projectChipPct: {
    backgroundColor: colors.primarySofter,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  projectChipPctText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
});
