import { useState } from "react";
import { Alert, StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { api } from "../../src/lib/api";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

const perks = [
  { icon: "layers-outline", text: "Unlimited projects" },
  { icon: "chatbubbles-outline", text: "Real-time messaging" },
  { icon: "sparkles-outline", text: "AI briefings & recaps" },
  { icon: "shield-checkmark-outline", text: "End-to-end encrypted" },
] as const;

export default function RegisterScreen() {
  const login = useAuthStore((state) => state.login);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/auth/register/", {
        full_name: name,
        email,
        password,
        password_confirm: password,
      });
      await login(email.trim(), password);
      router.replace("/(auth)/onboarding");
    } catch {
      Alert.alert("Registration failed", "Please check the details and backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Create account"
        subtitle="Join FlowTeam today"
        actionIcon="arrow-back"
        onAction={() => router.back()}
      />

      {/* Perks row */}
      <View style={styles.perksRow}>
        {perks.map((p) => (
          <View key={p.text} style={styles.perkItem}>
            <View style={styles.perkIcon}>
              <Ionicons name={p.icon} size={15} color={colors.primary} />
            </View>
            <AppText variant="caption" style={styles.perkText}>{p.text}</AppText>
          </View>
        ))}
      </View>

      <Card style={styles.card} elevated>
        <AppText variant="heading">Your details</AppText>
        <AppText variant="caption" style={styles.cardSubtitle}>
          Takes less than 60 seconds to set up.
        </AppText>
        <View style={styles.fields}>
          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Sarah Chen"
            icon="person-outline"
          />
          <TextField
            label="Work email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="sarah@company.com"
            icon="mail-outline"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            placeholder="Minimum 8 characters"
            icon="lock-closed-outline"
            hint="Use a strong, unique password"
          />
        </View>

        <Button onPress={submit} loading={loading} size="lg" icon="arrow-forward" iconRight>
          Create account
        </Button>

        <AppText variant="micro" style={styles.terms}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </AppText>
      </Card>

      <Pressable style={styles.loginRow} onPress={() => router.back()}>
        <AppText variant="caption">Already have an account?</AppText>
        <AppText style={styles.loginLink}>Sign in</AppText>
      </Pressable>

      <AppText variant="micro" style={styles.note}>
        Google OAuth and invite links use the `flowteam://` deep-link scheme when backend mobile callbacks are enabled.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  perksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
  },
  perkIcon: {},
  perkText: {
    color: colors.primary,
    fontWeight: "700",
  },
  card: {
    gap: spacing.md,
  },
  cardSubtitle: {
    color: colors.muted,
    marginTop: -spacing.xs,
  },
  fields: {
    gap: spacing.sm,
  },
  terms: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: spacing.sm,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  note: {
    marginTop: spacing.md,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});
