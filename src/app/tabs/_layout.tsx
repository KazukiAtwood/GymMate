import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { isProfileReady } from "@/utils/profileValidation";

export default function TabsLayout() {
  const { profile } = useAuth();

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
        tabBarActiveTintColor: "#3C87F7",
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Découvrir",
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: "Demandes",
        }}
      />

      <Tabs.Screen
        name="relations"
        options={{
          title: "Relations",
        }}
      />

      <Tabs.Screen
        name="sessions"
        options={{
          title: "Séances",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
        }}
      />
    </Tabs>
  );
}
