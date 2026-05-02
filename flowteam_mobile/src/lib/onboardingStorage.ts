import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_KEY = "flowteam:intro_seen:v1";

export async function hasSeenIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INTRO_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function setSeenIntro(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Ignore storage failures; user will just see intro again.
  }
}

