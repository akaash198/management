import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Screen } from "../../src/components/Screen";
import { hasSeenIntro, setSeenIntro } from "../../src/lib/onboardingStorage";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useAuthStore } from "../../src/store/authStore";

type IntroSlide = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const slides: IntroSlide[] = [
  {
    key: "welcome",
    icon: "sparkles-outline",
    title: "Welcome to FlowTeam",
    body: "A fast workspace for projects, chat, meetings, and AI briefings.",
  },
  {
    key: "projects",
    icon: "layers-outline",
    title: "Plan projects clearly",
    body: "Keep tasks, milestones, files, and updates in one place — always in sync.",
  },
  {
    key: "collab",
    icon: "chatbubbles-outline",
    title: "Collaborate in real time",
    body: "Messages, notifications, and calendars that feel instant, not endless.",
  },
];

function clampIndex(index: number) {
  if (index < 0) return 0;
  if (index > slides.length - 1) return slides.length - 1;
  return index;
}

export default function IntroScreen() {
  const user = useAuthStore((state) => state.user);
  const scrollRef = useRef<ScrollView | null>(null);
  const [ready, setReady] = useState(false);
  const [alreadySeen, setAlreadySeen] = useState(false);
  const [page, setPage] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const seen = await hasSeenIntro();
      if (!mounted) return;
      setAlreadySeen(seen);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <Screen scroll={false}>
        <View style={styles.loadingWrap}>
          <AppText variant="muted">Loading…</AppText>
        </View>
      </Screen>
    );
  }

  if (user) return <Redirect href="/(tabs)/dashboard" />;
  if (alreadySeen) return <Redirect href="/(auth)/login" />;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!slideWidth) return;
    const x = e.nativeEvent.contentOffset.x;
    const next = clampIndex(Math.round(x / slideWidth));
    if (next !== page) setPage(next);
  };

  const goTo = (idx: number) => {
    if (!slideWidth) return;
    const next = clampIndex(idx);
    setPage(next);
    scrollRef.current?.scrollTo({ x: next * slideWidth, y: 0, animated: true });
  };

  const finish = async () => {
    await setSeenIntro();
    router.replace("/(auth)/login");
  };

  return (
    <Screen scroll={false} noPadding>
      <View style={styles.wrap}>
        <View style={styles.topRow}>
          <Pressable onPress={finish} hitSlop={12}>
            <AppText style={styles.skipText}>Skip</AppText>
          </Pressable>
        </View>

        <View
          style={styles.carouselWrap}
          onLayout={(e: LayoutChangeEvent) => {
            const nextWidth = Math.floor(e.nativeEvent.layout.width);
            if (nextWidth && nextWidth !== slideWidth) setSlideWidth(nextWidth);
          }}
        >
          <ScrollView
            ref={(node) => {
              scrollRef.current = node;
            }}
            horizontal
            pagingEnabled
            scrollEnabled={slideWidth > 0}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.carousel}
          >
            {slides.map((slide) => (
              <View key={slide.key} style={[styles.slide, { width: slideWidth || undefined }]}>
                <Card style={styles.slideCard} elevated>
                  <View style={styles.iconWrap}>
                    <Ionicons name={slide.icon} size={22} color={colors.primary} />
                  </View>
                  <AppText style={styles.title}>{slide.title}</AppText>
                  <AppText style={styles.body}>{slide.body}</AppText>
                </Card>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.dotsRow}>
          {slides.map((s, idx) => (
            <Pressable key={s.key} onPress={() => goTo(idx)} hitSlop={10}>
              <View style={[styles.dot, idx === page && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.ctaRow}>
          <Button
            variant="secondary"
            onPress={() => goTo(page - 1)}
            disabled={page === 0}
            icon="arrow-back"
          >
            Back
          </Button>
          {page < slides.length - 1 ? (
            <Button onPress={() => goTo(page + 1)} icon="arrow-forward" iconRight>
              Next
            </Button>
          ) : (
            <Button onPress={finish} icon="checkmark" iconRight>
              Get started
            </Button>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
  },
  topRow: {
    width: "100%",
    alignItems: "flex-end",
  },
  skipText: {
    color: colors.primary,
    fontWeight: "800",
  },
  carouselWrap: {
    flex: 1,
    justifyContent: "center",
  },
  carousel: {
    alignItems: "center",
  },
  slide: {
    paddingHorizontal: spacing.sm,
  },
  slideCard: {
    width: "100%",
    maxWidth: 420,
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: "center",
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  body: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  dotActive: {
    width: 18,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderColor: "rgba(0,0,0,0.0)",
  },
  ctaRow: {
    width: "100%",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
