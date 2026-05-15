import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../lib/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
};

export function EmptyState({ icon = "cube-outline", title, subtitle, actionLabel, onAction, iconColor }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { borderColor: (iconColor ?? colors.muted) + "33" }]}>
        <Ionicons name={icon} size={30} color={iconColor ?? colors.muted} />
      </View>
      <AppText variant="heading" style={styles.title}>{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" style={styles.subtitle}>{subtitle}</AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button onPress={onAction} variant="secondary" size="sm" style={styles.btn}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.faint,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: "center",
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  btn: {
    marginTop: spacing.sm,
  },
});
