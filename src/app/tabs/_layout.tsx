import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { isProfileReady } from "@/utils/profileValidation";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: {
  name: "discover" | "requests" | "relations" | "sessions" | "profile";
  title: string;
  icon: IconName;
  iconFocused: IconName;
}[] = [
  { name: "discover", title: "Découvrir", icon: "compass-outline", iconFocused: "compass" },
  { name: "requests", title: "Demandes", icon: "paper-plane-outline", iconFocused: "paper-plane" },
  { name: "relations", title: "Relations", icon: "people-outline", iconFocused: "people" },
  { name: "sessions", title: "Séances", icon: "barbell-outline", iconFocused: "barbell" },
  { name: "profile", title: "Profil", icon: "person-outline", iconFocused: "person" },
];

export default function TabsLayout() {
  const { profile } = useAuth();
  const colors = useTheme();

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
