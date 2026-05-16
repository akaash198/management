import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SplashScreen } from "../src/screens/SplashScreen";
import { useAuthStore } from "../src/store/authStore";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const boot = useAuthStore((state) => state.boot);
  const isBooting = useAuthStore((state) => state.isBooting);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (isBooting) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="projects/[id]"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="tasks/[id]"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="my-tasks"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              presentation: "card",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="team"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="meetings"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

