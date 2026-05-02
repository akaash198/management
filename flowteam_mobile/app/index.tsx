import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { hasSeenIntro } from "../src/lib/onboardingStorage";
import { SplashScreen } from "../src/screens/SplashScreen";

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const seen = await hasSeenIntro();
      if (!mounted) return;
      setIntroSeen(seen);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (introSeen === null) return <SplashScreen tagline="Getting things ready…" />;

  if (user) return <Redirect href="/(tabs)/dashboard" />;
  return <Redirect href={introSeen ? "/(auth)/login" : "/(auth)/intro"} />;
}
