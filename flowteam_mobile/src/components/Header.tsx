import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../lib/theme";
import { AppText } from "./AppText";

type HeaderProps = {
  title: string;
  subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  onSecondaryAction?: () => void;
  badge?: number;
};

export function Header({
  title,
  subtitle,
  actionIcon = "search",
  onAction,
  secondaryIcon,
  onSecondaryAction,
  badge,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <View style={styles.brandRow}>
          <LinearGradient colors={colors.gradPrimary} style={styles.brandDot} />
          <AppText variant="micro" style={styles.eyebrow}>
            FlowTeam
          </AppText>
        </View>
        <AppText variant="title" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {secondaryIcon ? (
          <Pressable
            onPress={onSecondaryAction}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Ionicons name={secondaryIcon} size={19} color={colors.muted} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.actionPressed]}
        >
          <Ionicons name={actionIcon} size={19} color={colors.ink} />
          {badge && badge > 0 ? (
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>{badge > 9 ? "9+" : badge}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  brandDot: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  eyebrow: {
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    backgroundColor: colors.surfaceGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.glassBorder,
  },
  actionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
});
