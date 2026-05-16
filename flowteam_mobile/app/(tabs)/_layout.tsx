import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform, Text } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius, spacing } from "../../src/lib/theme";
import { useChannels, useNotifications } from "../../src/lib/queries";
import { useAuthStore } from "../../src/store/authStore";

type IconName = keyof typeof Ionicons.glyphMap;

const tabs: Array<{ name: string; icon: IconName; iconActive: IconName; label: string }> = [
  { name: "dashboard", icon: "home-outline", iconActive: "home", label: "Home" },
  { name: "projects",  icon: "briefcase-outline", iconActive: "briefcase", label: "Projects" },
  { name: "messages",  icon: "chatbubbles-outline", iconActive: "chatbubbles", label: "Messages" },
  { name: "calendar",  icon: "calendar-outline", iconActive: "calendar", label: "Calendar" },
  { name: "notifications", icon: "notifications-outline", iconActive: "notifications", label: "Alerts" },
];

function BadgeDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { isDemoMode, activeTeamId } = useAuthStore();
  const { data: channels = [] } = useChannels(isDemoMode, activeTeamId);
  const { data: notifications = [] } = useNotifications(isDemoMode);

  const unreadMessages = channels.reduce((s, c) => s + (c.unread_count ?? 0), 0);
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const tab = tabs.find((t) => t.name === name);
  const iconName = focused ? (tab?.iconActive ?? "ellipse") : (tab?.icon ?? "ellipse-outline");

  let badge = 0;
  if (name === "messages") badge = unreadMessages;
  if (name === "notifications") badge = unreadNotifications;

  return (
    <View style={styles.iconContainer}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons
          name={iconName}
          size={22}
          color={focused ? colors.canvas : colors.muted}
        />
      </View>
      <BadgeDot count={badge} />
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
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
      <Tabs.Screen name="meetings" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const BAR_HEIGHT = Platform.OS === "ios" ? 82 : 68;

const styles = StyleSheet.create({
  tabBar: {
    height: BAR_HEIGHT,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 22 : 8,
    backgroundColor: "rgba(6, 8, 16, 0.88)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorderDark,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 42,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900" as const,
  },
});
