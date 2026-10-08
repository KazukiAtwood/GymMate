import { Tabs } from "expo-router";

export default function TabsLayout() {
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
