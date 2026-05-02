import { StyleSheet, View } from "react-native";
import { colors, radius, typography } from "../lib/theme";
import { AppText } from "./AppText";

const statusMeta: Record<string, { color: string; bg: string; border: string }> = {
  todo: { color: colors.muted, bg: "rgba(148, 163, 184, 0.1)", border: colors.lineSubtle },
  to_do: { color: colors.muted, bg: "rgba(148, 163, 184, 0.1)", border: colors.lineSubtle },
  in_progress: { color: colors.blue, bg: colors.blueSoft, border: "rgba(96, 165, 250, 0.25)" },
  review: { color: colors.violet, bg: colors.violetSoft, border: "rgba(167, 139, 250, 0.25)" },
  done: { color: colors.success, bg: colors.successSoft, border: "rgba(52, 211, 153, 0.25)" },
  urgent: { color: colors.danger, bg: colors.dangerSoft, border: "rgba(248, 113, 113, 0.25)" },
  high: { color: colors.orange, bg: colors.orangeSoft, border: "rgba(245, 158, 11, 0.25)" },
  medium: { color: colors.yellow, bg: colors.yellowSoft, border: "rgba(217,155,0,0.25)" },
  low: { color: colors.muted, bg: "rgba(148, 163, 184, 0.1)", border: colors.lineSubtle },
  active: { color: colors.primary, bg: colors.primarySoft, border: "rgba(201, 162, 39, 0.25)" },
};

type StatusPillProps = {
  label: string;
  size?: "sm" | "md";
};

export function StatusPill({ label, size = "sm" }: StatusPillProps) {
  const key = label.toLowerCase().replace(/\s+/g, "_");
  const meta = statusMeta[key] ?? {
    color: colors.primary,
    bg: colors.primarySoft,
    border: "rgba(201, 162, 39, 0.25)",
  };

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: meta.bg, borderColor: meta.border },
        size === "md" && styles.pillMd,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <AppText
        style={[styles.text, { color: meta.color }, size === "md" && styles.textMd]}
      >
        {label.replace(/_/g, " ")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 5,
  },
  pillMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    ...typography.micro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textMd: {
    ...typography.label,
    letterSpacing: 0.4,
  },
});
