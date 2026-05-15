import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, typography } from "../lib/theme";
import { AppText } from "./AppText";
import { PresenceDot } from "./PresenceDot";

const gradients: Array<readonly [string, string]> = [
  [colors.primaryDark, colors.primary],
  ["#1a3f8c", colors.blueLight],
  ["#4a2e8c", colors.violetLight],
  [colors.teal, "#0ab3d8"],
  [colors.accent, colors.accentLight],
];

function pickGradient(name: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return gradients[hash % gradients.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  presence?: "online" | "away" | "offline" | "busy";
  borderColor?: string;
};

export function Avatar({ name, avatarUrl, size = 40, presence, borderColor }: Props) {
  const fontSize = size < 32 ? 10 : size < 48 ? 14 : 18;
  const presenceDotSize = Math.round(size * 0.28);

  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: borderColor ?? colors.glassBorder,
            },
          ]}
        />
      ) : (
        <LinearGradient
          colors={pickGradient(name)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: borderColor ?? colors.glassBorder,
            },
          ]}
        >
          <AppText style={[styles.initials, { fontSize }]}>{getInitials(name)}</AppText>
        </LinearGradient>
      )}
      {presence ? (
        <View
          style={[
            styles.presenceWrap,
            { width: presenceDotSize + 4, height: presenceDotSize + 4, borderRadius: (presenceDotSize + 4) / 2 },
          ]}
        >
          <PresenceDot status={presence} size={presenceDotSize} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  initials: {
    color: "rgba(255,255,255,0.94)",
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  presenceWrap: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
