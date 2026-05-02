import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Header } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { api } from "../../src/lib/api";
import { spacing } from "../../src/lib/theme";

export default function OnboardingScreen() {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/teams/", { name: teamName.trim() });
      router.replace("/(tabs)/dashboard");
    } catch {
      Alert.alert("Team setup failed", "Create the workspace later from Settings if needed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Workspace" subtitle="Set up your team hub" />
      <Card style={styles.card}>
        <AppText variant="heading">Create your team</AppText>
        <AppText variant="muted">This connects projects, messages, members, billing, and permissions under one workspace.</AppText>
        <TextField label="Team name" value={teamName} onChangeText={setTeamName} placeholder="Nova Agency" />
        <Button onPress={submit} loading={loading}>
          Create team
        </Button>
        <Button variant="ghost" onPress={() => router.replace("/(tabs)/dashboard")}>
          Skip for now
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});

