import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius, shadow } from "../../src/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const tabs: Array<{ name: string; icon: IconName; iconActive: IconName; label: string }> = [
  { name: "dashboard", icon: "home-outline", iconActive: "home", label: "Home" },
  { name: "projects", icon: "briefcase-outline", iconActive: "briefcase", label: "Projects" },
  { name: "messages", icon: "chatbubbles-outline", iconActive: "chatbubbles", label: "Messages" },
  { name: "calendar", icon: "calendar-outline", iconActive: "calendar", label: "Calendar" },
  { name: "notifications", icon: "notifications-outline", iconActive: "notifications", label: "Alerts" },
  { name: "settings", icon: "settings-outline", iconActive: "settings", label: "Profile" },
];

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const tab = tabs.find((t) => t.name === name);
  const iconName = focused ? (tab?.iconActive ?? "ellipse") : (tab?.icon ?? "ellipse-outline");
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={iconName}
        size={20}
        color={focused ? colors.canvasDark : colors.muted}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 86 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: "rgba(7, 11, 18, 0.82)",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderDark,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    ...shadow,
    shadowOpacity: 0.2,
    elevation: 18,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  iconWrap: {
    width: 38,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
});
