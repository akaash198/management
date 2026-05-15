import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../src/components/AppText";
import { Avatar } from "../src/components/Avatar";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { Header } from "../src/components/Header";
import { PresenceDot } from "../src/components/PresenceDot";
import { Screen } from "../src/components/Screen";
import { useTeamMembers } from "../src/lib/queries";
import { colors, radius, shadow, spacing } from "../src/lib/theme";
import { useAuthStore } from "../src/store/authStore";

const roleOrder = ["CEO", "Admin", "Manager", "Member", "Viewer"];

const roleMeta: Record<string, { color: string; bg: string }> = {
  CEO: { color: colors.primary, bg: colors.primarySoft },
  Admin: { color: colors.violet, bg: colors.violetSoft },
  Manager: { color: colors.blue, bg: colors.blueSoft },
  Member: { color: colors.teal, bg: colors.tealSoft },
  Viewer: { color: colors.muted, bg: colors.faint },
};

function getRoleMeta(role: string) {
  return roleMeta[role] ?? roleMeta.Member;
}

export default function TeamScreen() {
  const { isDemoMode, activeTeamId, teams, user } = useAuthStore();
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const { data: members = [], isLoading, refetch } = useTeamMembers(isDemoMode, activeTeamId);
  const [refreshing, setRefreshing] = useState(false);

  const sorted = [...members].sort((a, b) => {
    const ia = roleOrder.indexOf(a.role);
    const ib = roleOrder.indexOf(b.role);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

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
            title="Team"
            subtitle={activeTeam?.name ?? "Workspace"}
            actionIcon="arrow-back"
            onAction={() => router.back()}
            secondaryIcon="person-add-outline"
          />
        </View>

        {/* Team hero */}
        <LinearGradient
          colors={colors.gradHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecoA} />
          <View style={styles.heroTop}>
            <View style={styles.teamIcon}>
              <AppText style={styles.teamIconText}>
                {(activeTeam?.name ?? "T")[0].toUpperCase()}
              </AppText>
            </View>
            <View style={styles.heroInfo}>
              <AppText style={styles.heroName}>{activeTeam?.name ?? "Workspace"}</AppText>
              <AppText style={styles.heroRole}>
                Your role: <AppText style={[styles.heroRole, { color: colors.primary, fontWeight: "800" }]}>{activeTeam?.your_role ?? activeTeam?.my_role ?? "Member"}</AppText>
              </AppText>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <AppText style={styles.heroStatNum}>{members.length}</AppText>
              <AppText style={styles.heroStatLabel}>Members</AppText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <AppText style={styles.heroStatNum}>{members.filter((m) => m.role === "Manager" || m.role === "Admin" || m.role === "CEO").length}</AppText>
              <AppText style={styles.heroStatLabel}>Leaders</AppText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <AppText style={styles.heroStatNum}>{members.filter((m) => m.role === "Member").length}</AppText>
              <AppText style={styles.heroStatLabel}>Contributors</AppText>
            </View>
          </View>
        </LinearGradient>

        {/* Avatars stack */}
        {members.length > 0 ? (
          <Card style={styles.avatarStackCard}>
            <AppText variant="label" style={styles.sectionLabel}>Active members</AppText>
            <View style={styles.avatarRow}>
              {sorted.slice(0, 7).map((m, i) => (
                <View key={m.id} style={[styles.avatarWrap, { marginLeft: i > 0 ? -12 : 0 }]}>
                  <Avatar
                    name={m.user.full_name}
                    avatarUrl={m.user.avatar_url}
                    size={40}
                    presence="online"
                    borderColor={colors.surface}
                  />
                </View>
              ))}
              {members.length > 7 ? (
                <View style={[styles.moreAvatarWrap, { marginLeft: -12 }]}>
                  <AppText style={styles.moreAvatarText}>+{members.length - 7}</AppText>
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Member list */}
        {sorted.length === 0 && !isLoading ? (
          <EmptyState
            icon="people-outline"
            title="No team members"
            subtitle="Invite members to collaborate in your workspace."
            actionLabel="Invite member"
          />
        ) : (
          <View style={styles.list}>
            {sorted.map((member) => {
              const isMe = member.user.id === user?.id;
              const { color, bg } = getRoleMeta(member.role);

              return (
                <Card key={member.id} style={[styles.memberCard, isMe && styles.memberCardMe]}>
                  <Avatar
                    name={member.user.full_name}
                    avatarUrl={member.user.avatar_url}
                    size={44}
                    presence={isMe ? "online" : "away"}
                  />

                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <AppText variant="bodyBold" numberOfLines={1} style={styles.memberName}>
                        {member.user.full_name}
                      </AppText>
                      {isMe ? (
                        <View style={styles.mePill}>
                          <AppText style={styles.mePillText}>you</AppText>
                        </View>
                      ) : null}
                    </View>
                    <AppText variant="caption" style={styles.memberEmail} numberOfLines={1}>
                      {member.user.email}
                    </AppText>
                  </View>

                  <View style={[styles.rolePill, { backgroundColor: bg, borderColor: color + "44" }]}>
                    <AppText style={[styles.roleText, { color }]}>{member.role}</AppText>
                  </View>
                </Card>
              );
            })}
          </View>
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

  // Hero
  hero: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow,
    shadowOpacity: 0.18,
  },
  heroDecoA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.025)",
    top: -60,
    right: -50,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  teamIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  teamIconText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroRole: {
    color: colors.inkLight,
    fontSize: 13,
    fontWeight: "600",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 8,
  },
  heroStatNum: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Avatar stack
  avatarStackCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    letterSpacing: 0.7,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {},
  moreAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.faint,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  moreAvatarText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  // Member list
  list: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 68,
  },
  memberCardMe: {
    borderColor: colors.glassBorderActive,
    backgroundColor: colors.primarySofter,
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  memberName: {
    letterSpacing: 0,
  },
  mePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  mePillText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  memberEmail: {
    color: colors.muted,
  },
  rolePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
