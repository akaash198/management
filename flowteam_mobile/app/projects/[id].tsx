import { StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useProjects, useTasks } from "../../src/lib/queries";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

const statusOrder = ["urgent", "in_progress", "review", "todo", "done"];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTeamId, isDemoMode } = useAuthStore();
  const { data: projects = [] } = useProjects(isDemoMode, activeTeamId);
  const { data: tasks = [] } = useTasks(isDemoMode, id);
  const project = projects.find((item) => item.id === id) ?? projects[0];
  const pct = project?.progress ?? 0;

  const done = tasks.filter((t) => t.column_name?.toLowerCase().includes("done") || t.status === "done").length;
  const inProg = tasks.filter((t) => t.column_name?.toLowerCase().includes("progress") || t.status === "in_progress").length;
  const urgent = tasks.filter((t) => t.priority === "urgent").length;

  const sorted = [...tasks].sort(
    (a, b) =>
      statusOrder.indexOf(a.priority ?? a.column_name ?? a.status ?? "todo") -
      statusOrder.indexOf(b.priority ?? b.column_name ?? b.status ?? "todo")
  );

  return (
    <Screen>
      <Header
        title={project?.name ?? "Project"}
        subtitle="Mobile project workspace"
        actionIcon="arrow-back"
        onAction={() => router.back()}
        secondaryIcon="ellipsis-horizontal"
      />

      {/* ── Hero Summary Card ── */}
      <LinearGradient
        colors={colors.gradHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.1, y: 1.2 }}
        style={styles.heroCard}
      >
        <View style={styles.decoA} />
        <View style={styles.decoB} />

        <View style={styles.heroTop}>
          <StatusPill label={project?.status ?? "active"} size="md" />
          {project?.due_date && (
            <View style={styles.dueDateRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.65)" />
              <AppText style={styles.dueDate}>{project.due_date}</AppText>
            </View>
          )}
        </View>

        <AppText style={styles.heroTitle}>Progress</AppText>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={colors.gradPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            />
          </View>
          <AppText style={styles.progressPct}>{pct}%</AppText>
        </View>

        <AppText style={styles.heroDesc}>
          {project?.description ?? "Mobile-ready project workspace across tasks, milestones, docs, and approvals."}
        </AppText>

        {/* Mini stat pills */}
        <View style={styles.miniStats}>
          <View style={styles.miniStat}>
            <AppText style={styles.miniStatNum}>{tasks.length}</AppText>
            <AppText style={styles.miniStatLabel}>Total</AppText>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <AppText style={styles.miniStatNum}>{inProg}</AppText>
            <AppText style={styles.miniStatLabel}>In Progress</AppText>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <AppText style={styles.miniStatNum}>{done}</AppText>
            <AppText style={styles.miniStatLabel}>Done</AppText>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <AppText style={[styles.miniStatNum, urgent > 0 && styles.urgentNum]}>{urgent}</AppText>
            <AppText style={styles.miniStatLabel}>Urgent</AppText>
          </View>
        </View>
      </LinearGradient>

      {/* ── Quick Actions ── */}
      <View style={styles.actions}>
        <Button variant="primary" icon="add-circle-outline" style={{ flex: 1 }}>
          New task
        </Button>
        <Button variant="secondary" icon="sparkles-outline" style={{ flex: 1 }}>
          AI summary
        </Button>
      </View>

      {/* ── Tasks ── */}
      <View style={styles.sectionHeader}>
        <AppText variant="heading">Tasks</AppText>
        <View style={styles.taskCountPill}>
          <AppText style={styles.taskCountText}>{tasks.length} total</AppText>
        </View>
      </View>

      <View style={styles.list}>
        {sorted.map((task) => {
          const isDone = task.column_name?.toLowerCase().includes("done") || task.status === "done";
          const assigneeName = task.assignee?.full_name ?? task.assignee_name ?? "Unassigned";
          return (
          <Pressable
            key={task.id}
            style={({ pressed }) => [pressed && styles.taskPressed]}
          >
            <Card style={styles.taskCard}>
              <View style={styles.taskTop}>
                <View style={styles.checkCircle}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color={colors.surface} />
                  ) : null}
                </View>
                <View style={styles.taskCopy}>
                  <AppText
                    variant="bodyBold"
                    numberOfLines={2}
                    style={isDone ? styles.doneText : undefined}
                  >
                    {task.title}
                  </AppText>
                  <View style={styles.taskMeta}>
                    <View style={styles.assigneeRow}>
                      <View style={styles.avatarMini}>
                        <AppText style={styles.avatarMiniText}>
                          {(assigneeName)[0].toUpperCase()}
                        </AppText>
                      </View>
                      <AppText variant="caption">{assigneeName}</AppText>
                    </View>
                    {task.due_date ? (
                      <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={11} color={colors.muted} />
                        <AppText variant="caption">{task.due_date}</AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <View style={styles.taskPills}>
                <StatusPill label={task.column_name ?? task.status ?? "todo"} />
                <StatusPill label={task.priority ?? "medium"} />
              </View>
            </Card>
          </Pressable>
        )})}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Hero card
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadow,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 10,
  },
  decoA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.035)",
    top: -60,
    right: -50,
  },
  decoB: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primarySoft,
    bottom: -20,
    left: 20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDate: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  progressPct: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    width: 38,
    textAlign: "right",
  },
  heroDesc: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  miniStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginTop: spacing.xs,
  },
  miniStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  miniStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 8,
  },
  miniStatNum: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
  },
  urgentNum: {
    color: colors.danger,
  },
  miniStatLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  taskCountPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.24)",
  },
  taskCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  // Task list
  list: {
    gap: spacing.xs + 2,
  },
  taskCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  taskTop: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: "rgba(103, 232, 249, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  taskCopy: {
    flex: 1,
    gap: 4,
  },
  doneText: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  taskPills: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  taskPressed: {
    opacity: 0.88,
  },
});
