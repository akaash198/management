import { Alert, StyleSheet, View, Pressable, Switch } from "react-native";
import { useState } from "react";
import * as Notifications from "expo-notifications";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { getApiBaseUrl, getWsBaseUrl } from "../../src/lib/runtime";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
};

function SettingRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  toggle,
  toggleValue,
  onToggle,
  onPress,
  danger,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && !toggle && styles.settingRowPressed]}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <AppText
        variant="body"
        style={[styles.settingLabel, danger && styles.settingLabelDanger]}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {value ? (
        <AppText variant="caption" style={styles.settingValue} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.line, true: colors.primary }}
          thumbColor={colors.surface}
        />
      ) : (
        !danger && (
          <Ionicons name="chevron-forward" size={15} color={colors.line} />
        )
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, teams, activeTeamId, isDemoMode, logout } = useAuthStore();
  const activeTeam = teams.find((team) => team.id === activeTeamId);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const requestPush = async () => {
    const result = await Notifications.requestPermissionsAsync();
    setNotificationsOn(result.granted);
    Alert.alert(
      "Push permission",
      result.granted ? "Notifications are allowed." : "Notifications not allowed."
    );
  };

  const signOut = async () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Screen>
      <Header title="Profile" subtitle={activeTeam?.name ?? "No workspace"} actionIcon="create-outline" />

      {/* ── Avatar Card ── */}
      <Card style={styles.avatarCard} elevated>
        <LinearGradient
          colors={colors.gradHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGrad}
        >
          <AppText style={styles.avatarInitials}>{initials}</AppText>
        </LinearGradient>
        <View style={styles.avatarInfo}>
          <AppText variant="heading">{user?.full_name ?? "Signed out"}</AppText>
          <AppText variant="caption">{user?.email ?? "No email"}</AppText>
          {isDemoMode ? (
            <View style={styles.demoPill}>
              <Ionicons name="flask-outline" size={11} color={colors.accent} />
              <AppText style={styles.demoText}>Preview mode - sample data</AppText>
            </View>
          ) : (
            <View style={styles.verifiedPill}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <AppText style={styles.verifiedText}>Verified account</AppText>
            </View>
          )}
        </View>
        <Pressable style={styles.editBtn}>
          <Ionicons name="pencil" size={15} color={colors.primary} />
        </Pressable>
      </Card>

      {/* ── Workspace Card ── */}
      <AppText variant="label" style={styles.sectionLabel}>Workspace</AppText>
      <Card style={styles.settingsCard}>
        <SettingRow
          icon="layers-outline"
          iconColor={colors.primary}
          iconBg={colors.primarySoft}
          label={activeTeam?.name ?? "No team"}
          value="Active"
        />
        <View style={styles.divider} />
        <SettingRow
          icon="people-outline"
          iconColor={colors.blue}
          iconBg={colors.blueSoft}
          label="Team members"
          value={`${teams.length} workspaces`}
        />
      </Card>

      {/* ── Notifications Card ── */}
      <AppText variant="label" style={styles.sectionLabel}>Notifications</AppText>
      <Card style={styles.settingsCard}>
        <SettingRow
          icon="notifications-outline"
          iconColor={colors.violet}
          iconBg={colors.violetSoft}
          label="Push notifications"
          toggle
          toggleValue={notificationsOn}
          onToggle={(v) => { setNotificationsOn(v); if (v) requestPush(); }}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="mail-outline"
          iconColor={colors.blue}
          iconBg={colors.blueSoft}
          label="Email digest"
          value="Daily"
        />
      </Card>

      {/* ── Security Card ── */}
      <AppText variant="label" style={styles.sectionLabel}>Security</AppText>
      <Card style={styles.settingsCard}>
        <SettingRow
          icon="finger-print"
          iconColor={colors.primary}
          iconBg={colors.primarySoft}
          label="Biometric unlock"
          toggle
          toggleValue={biometric}
          onToggle={setBiometric}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="key-outline"
          iconColor={colors.accent}
          iconBg={colors.accentSoft}
          label="Change password"
        />
        <View style={styles.divider} />
        <SettingRow
          icon="qr-code-outline"
          iconColor={colors.violet}
          iconBg={colors.violetSoft}
          label="Two-factor auth (2FA)"
        />
      </Card>

      {/* ── Backend Info ── */}
      <AppText variant="label" style={styles.sectionLabel}>Backend</AppText>
      <Card style={[styles.settingsCard, styles.backendCard]}>
        <View style={styles.backendRow}>
          <Ionicons name="server-outline" size={13} color={colors.muted} />
          <AppText variant="caption" style={styles.backendText} numberOfLines={1}>
            API: {getApiBaseUrl()}
          </AppText>
        </View>
        <View style={styles.backendRow}>
          <Ionicons name="wifi-outline" size={13} color={colors.muted} />
          <AppText variant="caption" style={styles.backendText} numberOfLines={1}>
            WS: {getWsBaseUrl()}
          </AppText>
        </View>
      </Card>

      {/* ── Danger zone ── */}
      <Pressable onPress={signOut} style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <AppText style={styles.signOutText}>Sign out</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Avatar card
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  avatarGrad: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    flexShrink: 0,
  },
  avatarInitials: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  avatarInfo: {
    flex: 1,
    gap: 3,
  },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  demoText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  verifiedText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Section label
  sectionLabel: {
    marginBottom: spacing.xs,
    marginLeft: 2,
    color: colors.muted,
    letterSpacing: 0.7,
  },

  // Settings card
  settingsCard: {
    padding: 0,
    gap: 0,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 56,
  },
  settingRowPressed: {
    backgroundColor: colors.faint,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingLabel: {
    flex: 1,
  },
  settingLabelDanger: {
    color: colors.danger,
  },
  settingValue: {
    color: colors.muted,
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lineSubtle,
    marginLeft: spacing.md + 34 + spacing.sm,
  },

  // Backend
  backendCard: {
    gap: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  backendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backendText: {
    flex: 1,
    color: colors.muted,
    fontFamily: "monospace",
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.24)",
    backgroundColor: colors.dangerSoft,
  },
  signOutBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  signOutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800",
  },
});
