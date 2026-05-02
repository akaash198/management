import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

const trustItems = [
  { icon: "lock-closed-outline", label: "Encrypted" },
  { icon: "flash-outline", label: "Real-time" },
  { icon: "sparkles-outline", label: "AI-powered" },
] as const;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const demoLogin = useAuthStore((state) => state.demoLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch {
      Alert.alert("Unable to sign in", "Check your backend URL, email, and password.");
    } finally {
      setLoading(false);
    }
  };

  const openDemo = () => {
    demoLogin();
    router.replace("/(tabs)/dashboard");
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <LinearGradient
          colors={colors.gradHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroPanel}
        >
          <View style={styles.logoWrap}>
            <View style={styles.logo}>
              <AppText style={styles.logoLetter}>F</AppText>
            </View>
            <View style={styles.logoTextCol}>
              <AppText style={styles.logoName}>FlowTeam</AppText>
              <View style={styles.heroBadge}>
                <View style={styles.heroBadgeDot} />
                <AppText style={styles.heroBadgeText}>Work smarter together</AppText>
              </View>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <AppText style={styles.heroTitle}>
              Your workspace,{"\n"}in your pocket.
            </AppText>
            <AppText style={styles.heroSubtitle}>
              Projects - Messages - Meetings - AI Briefings
            </AppText>
          </View>

          <View style={styles.trustRow}>
            {trustItems.map((item) => (
              <View key={item.label} style={styles.trustPill}>
                <Ionicons name={item.icon} size={11} color={colors.primary} />
                <AppText style={styles.trustText}>{item.label}</AppText>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Card style={styles.authCard} elevated>
          <AppText variant="heading" style={styles.authTitle}>Sign in</AppText>
          <AppText variant="caption" style={styles.authSubtitle}>
            Continue to your FlowTeam workspace
          </AppText>

          <View style={styles.fields}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="you@company.com"
              icon="mail-outline"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              placeholder="Your password"
              icon="lock-closed-outline"
              hint="Min. 8 characters"
            />
          </View>

          <Pressable style={styles.forgotBtn}>
            <AppText style={styles.forgotText}>Forgot password?</AppText>
          </Pressable>

          <Button onPress={submit} loading={loading} size="lg" icon="arrow-forward" iconRight>
            Sign in
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText variant="caption" style={styles.dividerText}>or</AppText>
            <View style={styles.dividerLine} />
          </View>

          <Button variant="secondary" onPress={openDemo} icon="eye-outline">
            Preview with sample data
          </Button>

          <Pressable style={styles.createRow} onPress={() => router.push("/(auth)/register")}>
            <AppText variant="caption">Don't have an account?</AppText>
            <AppText style={styles.createLink}>Create account</AppText>
          </Pressable>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-start",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  heroPanel: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  logoTextCol: {
    gap: 3,
  },
  logoName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  heroBadgeText: {
    color: colors.inkLight,
    fontSize: 10,
    fontWeight: "700",
  },
  heroCopy: {
    gap: 4,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroSubtitle: {
    color: colors.inkLight,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  trustText: {
    color: colors.inkLight,
    fontSize: 10,
    fontWeight: "700",
  },
  authCard: {
    gap: spacing.md,
  },
  authTitle: {
    letterSpacing: 0,
  },
  authSubtitle: {
    color: colors.muted,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  fields: {
    gap: spacing.sm,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: -spacing.xs,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    color: colors.muted,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  createLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
