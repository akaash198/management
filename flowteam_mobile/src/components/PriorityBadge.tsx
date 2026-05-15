import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../lib/theme";
import { AppText } from "./AppText";

type Priority = "low" | "normal" | "medium" | "high" | "urgent" | string;

const meta: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  urgent: { color: colors.danger, bg: colors.dangerSoft, icon: "alert-circle", label: "Urgent" },
  high: { color: colors.orange, bg: colors.orangeSoft, icon: "arrow-up-circle", label: "High" },
  medium: { color: colors.yellow, bg: colors.yellowSoft, icon: "remove-circle", label: "Medium" },
  normal: { color: colors.blue, bg: colors.blueSoft, icon: "remove-circle-outline", label: "Normal" },
  low: { color: colors.muted, bg: colors.faint, icon: "arrow-down-circle", label: "Low" },
};

type Props = {
  priority?: Priority;
  compact?: boolean;
};

export function PriorityBadge({ priority = "normal", compact = false }: Props) {
  const key = priority.toLowerCase();
  const m = meta[key] ?? meta.normal;

  if (compact) {
    return (
      <View style={[styles.dot, { backgroundColor: m.color }]} />
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: m.bg, borderColor: m.color + "33" }]}>
      <Ionicons name={m.icon} size={10} color={m.color} />
      <AppText style={[styles.label, { color: m.color }]}>{m.label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
