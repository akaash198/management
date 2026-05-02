import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Pressable,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../lib/theme";
import { AppText } from "./AppText";

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
};

export function TextField({
  label,
  hint,
  error,
  icon,
  secureToggle = false,
  secureTextEntry,
  style,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrap}>
      <AppText variant="label" style={[styles.label, error ? styles.labelError : null]}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputWrap,
          focused && styles.focused,
          error ? styles.errorBorder : null,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={focused ? colors.primary : colors.muted}
            style={styles.iconLeft}
          />
        ) : null}
        <TextInput
          placeholderTextColor={colors.mutedLight}
          autoCapitalize="none"
          style={[styles.input, icon ? styles.inputWithIcon : null, style]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          {...props}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} style={styles.eyeBtn}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? (
        <AppText variant="micro" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="micro" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: colors.inkLight,
    letterSpacing: 0.8,
  },
  labelError: {
    color: colors.danger,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.glassBorderDark,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
  },
  errorBorder: {
    borderColor: colors.danger,
  },
  iconLeft: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.ink,
    ...typography.body,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  eyeBtn: {
    paddingLeft: spacing.sm,
  },
  hint: {
    color: colors.muted,
  },
  errorText: {
    color: colors.danger,
  },
});
