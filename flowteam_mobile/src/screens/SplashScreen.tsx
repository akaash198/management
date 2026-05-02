import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../components/AppText";
import { colors } from "../lib/theme";

type SplashScreenProps = {
  tagline?: string;
};

export function SplashScreen({ tagline = "Loading your workspace…" }: SplashScreenProps) {
  return (
    <LinearGradient
      colors={colors.gradHero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.splash}
    >
      <View style={styles.splashLogo}>
        <AppText style={styles.splashLogoText}>F</AppText>
      </View>
      <AppText style={styles.splashName}>FlowTeam</AppText>
      <AppText style={styles.splashTagline}>{tagline}</AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  splashLogoText: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: "900",
  },
  splashName: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
  },
  splashTagline: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "600",
  },
});

