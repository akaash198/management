import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { TaskCreateModal } from "../../src/components/TaskCreateModal";
import { useProjects, useTasks } from "../../src/lib/queries";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

const accents = [colors.primary, colors.blue, colors.accent, colors.violet, colors.teal] as const;

export default function ProjectsScreen() {
  const { activeTeamId, isDemoMode } = useAuthStore();
  const { data: projects = [], refetch: refetchProjects } = useProjects(isDemoMode, activeTeamId);
  const { data: tasks = [], refetch: refetchTasks } = useTasks(isDemoMode);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const openProjects = projects.filter((p) => (p.status ?? "active") !== "archived").length;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchTasks()]);
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
            title="Projects"
            subtitle={`${projects.length} active workspaces`}
            actionIcon="add-circle-outline"
            onAction={() => setShowCreate(true)}
          />
        </View>

        <View style={styles.inner}>
          <Card style={styles.summary} glass>
            <View>
              <AppText variant="label" style={styles.summaryLabel}>Portfolio</AppText>
              <AppText style={styles.summaryValue}>{openProjects}</AppText>
              <AppText variant="caption">Live initiatives</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryMeta}>
              <View style={styles.metaLine}>
                <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
                <AppText variant="caption">{tasks.length} tasks tracked</AppText>
              </View>
              <View style={styles.metaLine}>
                <Ionicons name="pulse-outline" size={14} color={colors.accent} />
                <AppText variant="caption">Delivery health synced</AppText>
              </View>
            </View>
          </Card>

          {projects.length === 0 ? (
            <EmptyState
              icon="briefcase-outline"
              title="No projects yet"
              subtitle="Create your first project to get started."
              actionLabel="New project"
              iconColor={colors.primary}
            />
          ) : (
            <View style={styles.list}>
              {projects.map((project, index) => {
                const accent = project.color ?? accents[index % accents.length];
                const pct = project.task_count
                  ? Math.round(((project.completed_task_count ?? 0) / project.task_count) * 100)
                  : (project.progress ?? 0);
                const projectTasks = project.task_count ?? tasks.filter((t) => t.project === project.id).length;

                return (
                  <Pressable
                    key={project.id}
                    onPress={() => router.push(`/projects/${project.id}`)}
                    style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
                  >
                    <Card style={styles.project} elevated>
                      <View style={[styles.accentRail, { backgroundColor: accent }]} />

                      <View style={styles.projectHeader}>
                        <View style={[styles.projectIconWrap, { backgroundColor: `${accent}24`, borderColor: `${accent}55` }]}>
                          <Ionicons name={project.icon ? project.icon as any : "layers"} size={18} color={accent} />
                        </View>

                        <View style={styles.projectTitle}>
                          <AppText variant="heading" numberOfLines={1}>
                            {project.name}
                          </AppText>
                          <AppText variant="caption" numberOfLines={2}>
                            {project.description ?? "Mobile-ready project workspace"}
                          </AppText>
                        </View>

                        <StatusPill label={project.status ?? "active"} size="sm" />
                      </View>

                      <View style={styles.progressSection}>
                        <View style={styles.progressMeta}>
                          <AppText variant="caption">Progress</AppText>
                          <AppText style={[styles.progressPct, { color: accent }]}>{pct}%</AppText>
                        </View>
                        <View style={styles.progressTrack}>
                          <LinearGradient
                            colors={[accent, colors.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${pct}%` }]}
                          />
                        </View>
                      </View>

                      <View style={styles.footer}>
                        <View style={styles.footerMeta}>
                          <View style={styles.metaItem}>
                            <Ionicons name="checkbox-outline" size={13} color={colors.muted} />
                            <AppText variant="caption">{projectTasks} tasks</AppText>
                          </View>
                          {project.deadline ? (
                            <View style={styles.metaItem}>
                              <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                              <AppText variant="caption">{project.deadline}</AppText>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.openBtn}>
                          <AppText style={[styles.openBtnText, { color: accent }]}>Open board</AppText>
                          <Ionicons name="arrow-forward" size={13} color={accent} />
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
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
  content: { paddingBottom: 100 },
  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  inner: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: {
    color: colors.primary,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.lineSubtle,
  },
  summaryMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  pressable: {},
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  project: {
    gap: spacing.md,
    padding: 0,
    overflow: "hidden",
  },
  accentRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  projectIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  projectTitle: {
    flex: 1,
    gap: 2,
  },
  progressSection: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressPct: {
    fontSize: 13,
    fontWeight: "900",
  },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.faint,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSubtle,
    paddingTop: spacing.sm,
  },
  footerMeta: {
    flexDirection: "row",
    gap: spacing.md,
    flexShrink: 1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
