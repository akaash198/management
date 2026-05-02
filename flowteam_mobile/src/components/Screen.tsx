import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../lib/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  noPadding?: boolean;
};

export function Screen({ children, scroll = true, noPadding = false }: ScreenProps) {
  const content = (
    <View style={[styles.content, noPadding && styles.noPadding]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[colors.canvasDark, colors.canvas, colors.canvasMid]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topWash} />
      <View style={styles.sideWash} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="never"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  sideWash: {
    position: "absolute",
    top: 130,
    right: 0,
    width: 3,
    height: 280,
    backgroundColor: "rgba(249, 115, 22, 0.32)",
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
});
