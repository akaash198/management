import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Avatar } from "../../src/components/Avatar";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { Header } from "../../src/components/Header";
import { PriorityBadge } from "../../src/components/PriorityBadge";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useDeleteTask, useTask, useUpdateTask } from "../../src/lib/queries";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

function formatDate(str?: string | null) {
  if (!str) return null;
  try {
    return new Date(str).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return str;
  }
}

function isOverdue(str?: string | null): boolean {
  if (!str) return false;
  try {
    return new Date(str) < new Date();
  } catch {
    return false;
  }
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDemoMode } = useAuthStore();
  const { data: task, isLoading } = useTask(isDemoMode, id);
  const updateTask = useUpdateTask(isDemoMode);
  const deleteTask = useDeleteTask(isDemoMode);

  const handleMarkDone = () => {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, payload: { status: "done" } },
      {
        onSuccess: () => router.back(),
      }
    );
  };

  const handleDelete = () => {
    Alert.alert("Delete task", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTask.mutate(task!.id, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen>
        <Header title="Task" actionIcon="arrow-back" onAction={() => router.back()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen>
        <Header title="Task" actionIcon="arrow-back" onAction={() => router.back()} />
        <EmptyState icon="cube-outline" title="Task not found" subtitle="This task may have been deleted." />
      </Screen>
    );
  }

  const overdue = isOverdue(task.due_date) && task.status !== "done";
  const isDone = task.status === "done" || task.column_name?.toLowerCase().includes("done");
  const assigneeName = task.assignee?.full_name ?? task.assignee_name ?? "Unassigned";

  return (
    <Screen scroll={false} noPadding>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <Header
            title={task.issue_type ?? "Task"}
            subtitle={task.project_name ?? "Project"}
            actionIcon="arrow-back"
            onAction={() => router.back()}
            secondaryIcon="trash-outline"
            onSecondaryAction={handleDelete}
          />
        </View>

        {/* Hero card */}
        <LinearGradient
          colors={colors.gradHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.decoCircle} />

          <View style={styles.heroTop}>
            <PriorityBadge priority={task.priority} />
            <StatusPill label={task.column_name ?? task.status ?? "todo"} size="md" />
          </View>

          <AppText style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
            {task.title}
          </AppText>

          {task.description ? (
            <AppText style={styles.description}>{task.description}</AppText>
          ) : null}

          {overdue ? (
            <View style={styles.overdueRow}>
              <Ionicons name="warning" size={13} color={colors.danger} />
              <AppText style={styles.overdueText}>Overdue</AppText>
            </View>
          ) : null}
        </LinearGradient>

        {/* Meta grid */}
        <Card style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <AppText variant="label" style={styles.metaLabel}>Assignee</AppText>
              <View style={styles.metaValueRow}>
                <Avatar name={assigneeName} size={22} />
                <AppText variant="caption" style={styles.metaValueText}>{assigneeName}</AppText>
              </View>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaItem}>
              <AppText variant="label" style={styles.metaLabel}>Due date</AppText>
              <View style={styles.metaValueRow}>
                <Ionicons name="calendar-outline" size={14} color={overdue ? colors.danger : colors.muted} />
                <AppText
                  variant="caption"
                  style={[styles.metaValueText, overdue && styles.metaValueOverdue]}
                >
                  {formatDate(task.due_date) ?? "No date"}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.metaDividerH} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <AppText variant="label" style={styles.metaLabel}>Type</AppText>
              <AppText variant="caption" style={styles.metaValueText}>{task.issue_type ?? "Task"}</AppText>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaItem}>
              <AppText variant="label" style={styles.metaLabel}>Project</AppText>
              <AppText variant="caption" style={styles.metaValueText} numberOfLines={1}>
                {task.project_name ?? "—"}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Assignees list if multiple */}
        {task.assignees && task.assignees.length > 1 ? (
          <Card style={styles.assigneesCard}>
            <AppText variant="label" style={styles.sectionLabel}>Assignees</AppText>
            <View style={styles.assigneesList}>
              {task.assignees.map((a) => (
                <View key={a.id} style={styles.assigneeRow}>
                  <Avatar name={a.full_name} size={32} avatarUrl={a.avatar_url} />
                  <View style={styles.assigneeInfo}>
                    <AppText variant="bodyBold" style={styles.assigneeName}>{a.full_name}</AppText>
                    <AppText variant="caption" style={styles.assigneeEmail}>{a.email}</AppText>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* Actions */}
        {!isDone ? (
          <Pressable
            onPress={handleMarkDone}
            disabled={updateTask.isPending}
            style={({ pressed }) => [styles.markDoneBtn, pressed && styles.markDoneBtnPressed]}
          >
            <LinearGradient colors={colors.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.markDoneGrad}>
              {updateTask.isPending ? (
                <ActivityIndicator color={colors.canvasDark} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.canvasDark} />
                  <AppText style={styles.markDoneText}>Mark as Done</AppText>
                </>
              )}
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText style={styles.completedText}>Task completed</AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  hero: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow,
    shadowOpacity: 0.18,
  },
  decoCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.025)",
    top: -60,
    right: -50,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  taskTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  description: {
    color: colors.inkLight,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  overdueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.28)",
  },
  overdueText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  // Meta card
  metaCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: 0,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
  },
  metaItem: {
    flex: 1,
    gap: 5,
  },
  metaLabel: {
    color: colors.muted,
    letterSpacing: 0.7,
  },
  metaValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaValueText: {
    color: colors.ink,
    fontWeight: "700",
  },
  metaValueOverdue: {
    color: colors.danger,
  },
  metaDivider: {
    width: 1,
    backgroundColor: colors.lineSubtle,
    marginVertical: -spacing.md,
  },
  metaDividerH: {
    height: 1,
    backgroundColor: colors.lineSubtle,
    marginHorizontal: spacing.md,
  },

  // Assignees
  assigneesCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    letterSpacing: 0.7,
  },
  assigneesList: {
    gap: spacing.sm,
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  assigneeInfo: {
    flex: 1,
    gap: 1,
  },
  assigneeName: {
    fontSize: 14,
    letterSpacing: 0,
  },
  assigneeEmail: {
    color: colors.muted,
  },

  // Actions
  markDoneBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
  },
  markDoneBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  markDoneGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
  },
  markDoneText: {
    color: colors.canvasDark,
    fontSize: 16,
    fontWeight: "900",
  },
  completedBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.28)",
  },
  completedText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: "800",
  },
});
