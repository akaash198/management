import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../src/components/AppText";
import { Avatar } from "../src/components/Avatar";
import { Card } from "../src/components/Card";
import { Header } from "../src/components/Header";
import { PriorityBadge } from "../src/components/PriorityBadge";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { useChannels, useProjects, useSearchTasks } from "../src/lib/queries";
import { colors, radius, spacing, typography } from "../src/lib/theme";
import { useAuthStore } from "../src/store/authStore";

const SCOPES = ["All", "Tasks", "Projects", "Messages"] as const;
type Scope = typeof SCOPES[number];

export default function SearchScreen() {
  const { isDemoMode, activeTeamId } = useAuthStore();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("All");

  const { data: tasks = [], isLoading: tasksLoading } = useSearchTasks(isDemoMode, query, activeTeamId);
  const { data: projects = [] } = useProjects(isDemoMode, activeTeamId);
  const { data: channels = [] } = useChannels(isDemoMode, activeTeamId);

  const filteredProjects = query.trim().length > 1
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredChannels = query.trim().length > 1
    ? channels.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const isSearching = query.trim().length > 1;
  const hasResults = tasks.length > 0 || filteredProjects.length > 0 || filteredChannels.length > 0;

  return (
    <Screen scroll={false} noPadding>
      <View style={styles.headerWrap}>
        <Header
          title="Search"
          subtitle="Tasks, projects, messages"
          actionIcon="arrow-back"
          onAction={() => router.back()}
        />
      </View>

      {/* Search input */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search everything…"
            placeholderTextColor={colors.mutedLight}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Scope filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scopeScroll}
        contentContainerStyle={styles.scopeRow}
      >
        {SCOPES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            style={[styles.scopeChip, scope === s && styles.scopeChipActive]}
          >
            <AppText style={[styles.scopeText, scope === s && styles.scopeTextActive]}>{s}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
        {!isSearching ? (
          /* ── Empty / Initial state ── */
          <View style={styles.hintWrap}>
            <View style={styles.hintIcon}>
              <Ionicons name="search-outline" size={28} color={colors.muted} />
            </View>
            <AppText variant="heading" style={styles.hintTitle}>Search FlowTeam</AppText>
            <AppText variant="caption" style={styles.hintSubtitle}>
              Find tasks, projects, and messages instantly.
            </AppText>

            <View style={styles.recentSection}>
              <AppText variant="label" style={styles.sectionLabel}>Quick access</AppText>
              <View style={styles.quickList}>
                {[
                  { icon: "checkbox-outline" as const, label: "My open tasks", color: colors.primary, onPress: () => router.push("/my-tasks") },
                  { icon: "briefcase-outline" as const, label: "Active projects", color: colors.blue, onPress: () => router.push("/(tabs)/projects") },
                  { icon: "chatbubbles-outline" as const, label: "Messages", color: colors.violet, onPress: () => router.push("/(tabs)/messages") },
                  { icon: "calendar-outline" as const, label: "This week's agenda", color: colors.teal, onPress: () => router.push("/(tabs)/calendar") },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    style={({ pressed }) => [styles.quickItem, pressed && styles.quickItemPressed]}
                  >
                    <View style={[styles.quickItemIcon, { backgroundColor: item.color + "20" }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <AppText variant="body" style={styles.quickItemLabel}>{item.label}</AppText>
                    <Ionicons name="arrow-forward" size={14} color={colors.line} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : tasksLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="caption" style={styles.loadingText}>Searching…</AppText>
          </View>
        ) : !hasResults ? (
          <View style={styles.noResultsWrap}>
            <View style={styles.hintIcon}>
              <Ionicons name="search-circle-outline" size={28} color={colors.muted} />
            </View>
            <AppText variant="heading" style={styles.hintTitle}>No results</AppText>
            <AppText variant="caption" style={styles.hintSubtitle}>
              Try different keywords or check your spelling.
            </AppText>
          </View>
        ) : (
          <>
            {/* Tasks */}
            {(scope === "All" || scope === "Tasks") && tasks.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AppText variant="label" style={styles.sectionLabel}>Tasks</AppText>
                  <View style={styles.countBadge}>
                    <AppText style={styles.countText}>{tasks.length}</AppText>
                  </View>
                </View>
                <View style={styles.list}>
                  {tasks.slice(0, 10).map((task) => {
                    const assigneeName = task.assignee?.full_name ?? task.assignee_name ?? "Unassigned";
                    return (
                      <Pressable
                        key={task.id}
                        onPress={() => router.push(`/tasks/${task.id}`)}
                        style={({ pressed }) => [pressed && styles.itemPressed]}
                      >
                        <Card style={styles.taskItem}>
                          <View style={styles.taskItemTop}>
                            <View style={styles.taskItemInfo}>
                              <AppText variant="bodyBold" numberOfLines={1} style={styles.taskItemTitle}>
                                {task.title}
                              </AppText>
                              {task.project_name ? (
                                <AppText variant="caption" style={styles.projectLabel}>{task.project_name}</AppText>
                              ) : null}
                            </View>
                            <StatusPill label={task.column_name ?? task.status ?? "todo"} size="sm" />
                          </View>
                          <View style={styles.taskItemMeta}>
                            <PriorityBadge priority={task.priority} compact />
                            <Avatar name={assigneeName} size={16} />
                            <AppText variant="micro" style={styles.assigneeText}>{assigneeName}</AppText>
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Projects */}
            {(scope === "All" || scope === "Projects") && filteredProjects.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AppText variant="label" style={styles.sectionLabel}>Projects</AppText>
                  <View style={styles.countBadge}>
                    <AppText style={styles.countText}>{filteredProjects.length}</AppText>
                  </View>
                </View>
                <View style={styles.list}>
                  {filteredProjects.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/projects/${p.id}`)}
                      style={({ pressed }) => [pressed && styles.itemPressed]}
                    >
                      <Card style={styles.projectItem}>
                        <View style={[styles.projectAccent, { backgroundColor: p.color ?? colors.primary }]} />
                        <View style={styles.projectItemBody}>
                          <View style={[styles.projectIconWrap, { backgroundColor: (p.color ?? colors.primary) + "20" }]}>
                            <Ionicons name="layers-outline" size={16} color={p.color ?? colors.primary} />
                          </View>
                          <View style={styles.projectItemInfo}>
                            <AppText variant="bodyBold" numberOfLines={1}>{p.name}</AppText>
                            <AppText variant="caption" style={styles.projectMeta}>
                              {p.task_count ?? 0} tasks • {p.status ?? "Active"}
                            </AppText>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.line} />
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Messages / channels */}
            {(scope === "All" || scope === "Messages") && filteredChannels.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AppText variant="label" style={styles.sectionLabel}>Channels</AppText>
                  <View style={styles.countBadge}>
                    <AppText style={styles.countText}>{filteredChannels.length}</AppText>
                  </View>
                </View>
                <View style={styles.list}>
                  {filteredChannels.map((ch) => (
                    <Pressable
                      key={ch.id}
                      onPress={() =>
                        router.push({ pathname: "/(tabs)/messages/[id]", params: { id: ch.id, name: ch.name } })
                      }
                      style={({ pressed }) => [pressed && styles.itemPressed]}
                    >
                      <Card style={styles.channelItem}>
                        <View style={styles.channelHash}>
                          <AppText style={styles.hashText}>#</AppText>
                        </View>
                        <View style={styles.channelInfo}>
                          <AppText variant="bodyBold" numberOfLines={1}>{ch.name}</AppText>
                          {ch.last_message_text ? (
                            <AppText variant="caption" numberOfLines={1} style={styles.channelPreview}>
                              {ch.last_message_text}
                            </AppText>
                          ) : null}
                        </View>
                        {(ch.unread_count ?? 0) > 0 ? (
                          <View style={styles.unreadBadge}>
                            <AppText style={styles.unreadText}>{ch.unread_count}</AppText>
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={14} color={colors.line} />
                        )}
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  searchWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 48,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },

  scopeScroll: { marginTop: spacing.sm },
  scopeRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: 2,
  },
  scopeChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  scopeChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.glassBorderActive,
  },
  scopeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  scopeTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },

  results: { flex: 1, marginTop: spacing.md },
  resultsContent: { paddingBottom: 80, paddingHorizontal: spacing.md },

  hintWrap: {
    alignItems: "center",
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  hintIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.faint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  hintTitle: {
    textAlign: "center",
    letterSpacing: 0,
  },
  hintSubtitle: {
    color: colors.muted,
    textAlign: "center",
    maxWidth: 240,
  },

  recentSection: {
    width: "100%",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  quickList: {
    gap: spacing.xs,
  },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 52,
  },
  quickItemPressed: {
    opacity: 0.8,
    backgroundColor: colors.faint,
  },
  quickItemIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickItemLabel: {
    flex: 1,
  },

  loadingWrap: {
    paddingTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.muted,
  },

  noResultsWrap: {
    alignItems: "center",
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },

  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.faint,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  list: {
    gap: spacing.xs + 2,
  },
  itemPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },

  // Task item
  taskItem: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  taskItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  taskItemInfo: {
    flex: 1,
    gap: 2,
  },
  taskItemTitle: {
    letterSpacing: 0,
  },
  projectLabel: {
    color: colors.muted,
  },
  taskItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  assigneeText: {
    color: colors.muted,
  },

  // Project item
  projectItem: {
    padding: 0,
    overflow: "hidden",
  },
  projectAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  projectItemBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.md + 3,
  },
  projectIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  projectItemInfo: {
    flex: 1,
    gap: 2,
  },
  projectMeta: {
    color: colors.muted,
  },

  // Channel item
  channelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 64,
  },
  channelHash: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hashText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  channelInfo: {
    flex: 1,
    gap: 2,
  },
  channelPreview: {
    color: colors.muted,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: {
    color: colors.canvasDark,
    fontSize: 10,
    fontWeight: "900",
  },
});
