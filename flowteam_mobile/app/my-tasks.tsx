import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../src/components/AppText";
import { Avatar } from "../src/components/Avatar";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { Header } from "../src/components/Header";
import { PriorityBadge } from "../src/components/PriorityBadge";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { TaskCreateModal } from "../src/components/TaskCreateModal";
import { useTasks } from "../src/lib/queries";
import { colors, radius, spacing } from "../src/lib/theme";
import { useAuthStore } from "../src/store/authStore";

const FILTERS = ["All", "To Do", "In Progress", "Review", "Overdue", "Done"] as const;
type Filter = typeof FILTERS[number];

function matchesFilter(task: { status?: string; column_name?: string; due_date?: string | null; is_overdue?: boolean }, filter: Filter): boolean {
  const col = (task.column_name ?? task.status ?? "").toLowerCase();
  const today = new Date();
  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due ? due < today && !col.includes("done") : false;

  switch (filter) {
    case "All": return true;
    case "To Do": return col.includes("todo") || col.includes("to do") || col.includes("backlog") || task.status === "todo";
    case "In Progress": return col.includes("progress") || col.includes("active") || task.status === "in_progress";
    case "Review": return col.includes("review") || task.status === "review";
    case "Overdue": return overdue || task.is_overdue === true;
    case "Done": return col.includes("done") || col.includes("complete") || task.status === "done";
  }
}

function formatDate(str?: string | null) {
  if (!str) return null;
  try {
    const d = new Date(str);
    const today = new Date();
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return str;
  }
}

export default function MyTasksScreen() {
  const { isDemoMode, activeTeamId, user } = useAuthStore();
  const { data: tasks = [], isLoading, refetch } = useTasks(isDemoMode);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isAssignedToMe = t.assignee?.id === user?.id || t.assignee_name === user?.full_name?.split(" ")[0];
      return isDemoMode ? true : isAssignedToMe;
    });
  }, [tasks, user, isDemoMode]);

  const filtered = useMemo(() => myTasks.filter((t) => matchesFilter(t, activeFilter)), [myTasks, activeFilter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { All: 0, "To Do": 0, "In Progress": 0, Review: 0, Overdue: 0, Done: 0 };
    for (const filter of FILTERS) {
      c[filter] = myTasks.filter((t) => matchesFilter(t, filter)).length;
    }
    return c;
  }, [myTasks]);

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
            title="My Tasks"
            subtitle={`${myTasks.length} assigned to you`}
            actionIcon="arrow-back"
            onAction={() => router.back()}
            secondaryIcon="add-circle-outline"
            onSecondaryAction={() => setShowCreate(true)}
          />
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { borderLeftColor: colors.danger }]}>
            <AppText style={styles.statNum}>{counts.Overdue}</AppText>
            <AppText variant="micro" style={styles.statLbl}>Overdue</AppText>
          </View>
          <View style={[styles.statChip, { borderLeftColor: colors.accent }]}>
            <AppText style={styles.statNum}>{counts["In Progress"]}</AppText>
            <AppText variant="micro" style={styles.statLbl}>In Progress</AppText>
          </View>
          <View style={[styles.statChip, { borderLeftColor: colors.success }]}>
            <AppText style={styles.statNum}>{counts.Done}</AppText>
            <AppText variant="micro" style={styles.statLbl}>Done</AppText>
          </View>
          <View style={[styles.statChip, { borderLeftColor: colors.primary }]}>
            <AppText style={styles.statNum}>{counts["To Do"]}</AppText>
            <AppText variant="micro" style={styles.statLbl}>To Do</AppText>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            >
              <AppText style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </AppText>
              {counts[f] > 0 ? (
                <View style={[styles.filterBadge, activeFilter === f && styles.filterBadgeActive]}>
                  <AppText style={[styles.filterBadgeText, activeFilter === f && styles.filterBadgeTextActive]}>
                    {counts[f]}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>

        {/* Task list */}
        {filtered.length === 0 && !isLoading ? (
          <EmptyState
            icon="checkmark-done-circle-outline"
            title={activeFilter === "Done" ? "No completed tasks yet" : "No tasks here"}
            subtitle={activeFilter === "Overdue" ? "All tasks are on time!" : "Tasks assigned to you will appear here."}
            iconColor={activeFilter === "Done" ? colors.success : undefined}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((task) => {
              const overdue =
                task.due_date && new Date(task.due_date) < new Date() &&
                !(task.column_name ?? task.status ?? "").toLowerCase().includes("done");
              const assigneeName = task.assignee?.full_name ?? task.assignee_name ?? "Me";

              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/tasks/${task.id}`)}
                  style={({ pressed }) => [pressed && styles.taskPressed]}
                >
                  <Card style={styles.taskCard} elevated>
                    <View style={styles.taskTop}>
                      <View style={styles.taskLeft}>
                        <View style={styles.checkWrap}>
                          {(task.status === "done" || (task.column_name ?? "").toLowerCase().includes("done")) ? (
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                          ) : (
                            <View style={styles.unchecked} />
                          )}
                        </View>
                        <View style={styles.taskInfo}>
                          <AppText
                            variant="bodyBold"
                            numberOfLines={2}
                            style={[
                              styles.taskTitle,
                              (task.status === "done" || (task.column_name ?? "").toLowerCase().includes("done")) && styles.taskTitleDone,
                            ]}
                          >
                            {task.title}
                          </AppText>
                          {task.project_name ? (
                            <AppText variant="caption" style={styles.projectName} numberOfLines={1}>
                              {task.project_name}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.line} />
                    </View>

                    <View style={styles.taskMeta}>
                      <View style={styles.metaLeft}>
                        <PriorityBadge priority={task.priority} compact />
                        <StatusPill label={task.column_name ?? task.status ?? "todo"} size="sm" />
                        <Avatar name={assigneeName} size={18} />
                      </View>
                      {task.due_date ? (
                        <View style={[styles.dueDateRow, overdue && styles.dueDateRowOverdue]}>
                          <Ionicons name="time-outline" size={11} color={overdue ? colors.danger : colors.muted} />
                          <AppText style={[styles.dueDateText, overdue && styles.dueDateTextOverdue]}>
                            {formatDate(task.due_date)}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
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
  content: { paddingBottom: 100 },

  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  statsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    borderLeftWidth: 3,
    padding: spacing.sm,
    gap: 2,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: 0,
  },
  statLbl: {
    color: colors.muted,
  },

  filterScroll: {
    marginTop: spacing.md,
  },
  filterRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: 2,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.glassBorderActive,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.faint,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeActive: {
    backgroundColor: colors.primary,
  },
  filterBadgeText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  filterBadgeTextActive: {
    color: colors.canvasDark,
  },

  list: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  taskCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  taskTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  taskLeft: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  checkWrap: {
    marginTop: 2,
    flexShrink: 0,
  },
  unchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.glassBorderDark,
  },
  taskInfo: {
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    letterSpacing: 0,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  projectName: {
    color: colors.muted,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 28,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dueDateRowOverdue: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  dueDateText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  dueDateTextOverdue: {
    color: colors.danger,
  },
  taskPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
