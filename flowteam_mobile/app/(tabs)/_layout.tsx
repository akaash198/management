import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform, Text } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius, shadow, spacing } from "../../src/lib/theme";
import { useChannels, useMeetings, useNotifications } from "../../src/lib/queries";
import { useAuthStore } from "../../src/store/authStore";

type IconName = keyof typeof Ionicons.glyphMap;

const tabs: Array<{ name: string; icon: IconName; iconActive: IconName; label: string }> = [
  { name: "dashboard", icon: "home-outline", iconActive: "home", label: "Home" },
  { name: "projects", icon: "briefcase-outline", iconActive: "briefcase", label: "Projects" },
  { name: "messages", icon: "chatbubbles-outline", iconActive: "chatbubbles", label: "Messages" },
  { name: "meetings", icon: "videocam-outline", iconActive: "videocam", label: "Meetings" },
  { name: "calendar", icon: "calendar-outline", iconActive: "calendar", label: "Calendar" },
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
          size={20}
          color={focused ? colors.canvasDark : colors.muted}
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
    height: Platform.OS === "ios" ? 86 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
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
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
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
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
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
    fontWeight: "900",
  },
});
