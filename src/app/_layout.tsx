import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { logoutAccount } from "@/services/authService";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, initializing, profileLoading, error, refreshProfile } = useAuth();

  if (initializing || (user && profileLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3C87F7" />
        <Text style={styles.loadingText}>Chargement de la session...</Text>
      </View>
    );
  }

  if (user && error) {
    return (
      <ProfileLoadError message={error} onRetry={() => void refreshProfile()} />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
      </Stack.Protected>

      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="tabs" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="members/[userId]" />
        <Stack.Screen name="explore" />
      </Stack.Protected>
    </Stack>
  );
}

function ProfileLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    try {
      await logoutAccount();
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
      setLogoutError("La déconnexion a échoué. Réessayez.");
    }
  }

  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Profil indisponible</Text>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Réessayer</Text>
      </Pressable>
      {logoutError ? <Text style={styles.errorText}>{logoutError}</Text> : null}
      <Pressable onPress={() => void handleLogout()}>
        <Text style={styles.logout}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    marginTop: 16,
    color: "#6B7280",
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },

  errorText: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  button: {
    marginTop: 20,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  logout: {
    marginTop: 16,
    color: "#B91C1C",
    fontWeight: "700",
  },
});
