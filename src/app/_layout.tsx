import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useThemeControls } from "@/contexts/ThemeContext";
import { logoutAccount } from "@/services/authService";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    void import("@/services/notificationSetup");
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStatusBar />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useThemeControls();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

function RootNavigator() {
  const { user, initializing, profileLoading, error, refreshProfile } = useAuth();

  if (initializing || (user && profileLoading)) {
    return <SessionLoading />;
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
        <Stack.Screen name="gym" />
        <Stack.Screen name="members/[userId]" />
        <Stack.Screen name="requests/new" />
        <Stack.Screen name="chats/[chatId]" />
        <Stack.Screen name="explore" />
      </Stack.Protected>
    </Stack>
  );
}

function SessionLoading() {
  const { colors } = useThemeControls();

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textMuted }]}>Chargement de la session...</Text>
    </View>
  );
}

function ProfileLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { colors } = useThemeControls();
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
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorTitle, { color: colors.text }]}>Profil indisponible</Text>
      <Text style={[styles.errorText, { color: colors.textMuted }]}>{message}</Text>
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRetry}>
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Réessayer</Text>
      </Pressable>
      {logoutError ? <Text style={[styles.errorText, { color: colors.danger }]}>{logoutError}</Text> : null}
      <Pressable onPress={() => void handleLogout()}>
        <Text style={[styles.logout, { color: colors.danger }]}>Se déconnecter</Text>
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
    backgroundColor: "#C2410C",
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
