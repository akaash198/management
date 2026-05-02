import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { colors, typography } from "../lib/theme";

type Variant =
  | "display"
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "bodyBold"
  | "muted"
  | "caption"
  | "label"
  | "micro"
  | "small";

type AppTextProps = {
  children: ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function AppText({ children, variant = "body", style, numberOfLines }: AppTextProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.base, styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.ink,
    letterSpacing: 0,
  },
  display: {
    ...typography.display,
    color: colors.ink,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  heading: {
    ...typography.heading,
    color: colors.ink,
  },
  subheading: {
    ...typography.subheading,
    color: colors.inkLight,
  },
  body: {
    ...typography.body,
    color: colors.ink,
  },
  bodyBold: {
    ...typography.bodyBold,
    color: colors.ink,
  },
  muted: {
    ...typography.body,
    color: colors.muted,
  },
  caption: {
    ...typography.caption,
    color: colors.muted,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
  },
  micro: {
    ...typography.micro,
    color: colors.muted,
    textTransform: "uppercase",
  },
  // alias for backwards compat
  small: {
    ...typography.caption,
    color: colors.muted,
  },
});
