import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius, shadowSubtle, spacing } from "../lib/theme";

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  glass?: boolean;
};

export function Card({ children, style, elevated = false, glass = false }: CardProps) {
  if (glass) {
    return (
      <BlurView
        intensity={60}
        tint="dark"
        style={[styles.card, styles.glass, elevated && styles.elevated, style]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    padding: spacing.md,
    ...shadowSubtle,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassBorder,
  },
  glass: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.glassBorder,
    overflow: "hidden",
  },
});
