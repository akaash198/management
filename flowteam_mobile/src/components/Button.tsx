import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadowStrong, spacing, typography } from "../lib/theme";
import { AppText } from "./AppText";

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "surface";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  iconRight = false,
  size = "md",
  style,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const iconColor = isPrimary
    ? colors.canvasDark
    : variant === "danger"
    ? colors.canvas
    : variant === "secondary"
    ? colors.ink
    : colors.muted;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.canvas : colors.ink} />
      ) : (
        <View style={styles.label}>
          {icon && !iconRight ? (
            <Ionicons name={icon} size={size === "sm" ? 14 : 17} color={iconColor} style={styles.iconLeft} />
          ) : null}
          <AppText
            style={[
              styles.text,
              styles[`text_${variant}`],
              size === "sm" ? styles.textSm : null,
              size === "lg" ? styles.textLg : null,
            ]}
          >
            {children}
          </AppText>
          {icon && iconRight ? (
            <Ionicons name={icon} size={size === "sm" ? 14 : 17} color={iconColor} style={styles.iconRight} />
          ) : null}
        </View>
      )}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        styles[`size_${size}`],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={colors.gradPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  // Variants
  primary: {
    backgroundColor: colors.primaryDark,
    ...shadowStrong,
  },
  secondary: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  surface: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  // Sizes
  size_sm: {
    minHeight: 36,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  size_md: {},
  size_lg: {
    minHeight: 60,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.975 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
  text: {
    ...typography.bodyBold,
    color: colors.ink,
  },
  text_primary: {
    color: colors.canvasDark,
  },
  text_secondary: {
    color: colors.ink,
  },
  text_ghost: {
    color: colors.muted,
  },
  text_surface: {
    color: colors.ink,
  },
  text_danger: {
    color: colors.surface,
  },
  textSm: {
    fontSize: 13,
    fontWeight: "700",
  },
  textLg: {
    fontSize: 17,
    fontWeight: "800",
  },
});
