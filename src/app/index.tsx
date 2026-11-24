import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.toggle}>
        <ThemeToggle />
      </View>
      <View style={[styles.badge, { backgroundColor: colors.infoSurface }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>GymMate</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Trouve ton partenaire de sport.</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        Entraîne-toi avec des personnes qui partagent tes objectifs.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push("/auth/login")}
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Se connecter</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: colors.primary, backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push("/auth/register")}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Créer un compte</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  toggle: {
    position: "absolute",
    top: 56,
    right: 24,
  },

  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },

  badgeText: {
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
    maxWidth: 460,
  },

  description: {
    marginTop: 12,
    marginBottom: 28,
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 420,
  },

  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    maxWidth: 420,
  },

  pressed: {
    opacity: 0.75,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    maxWidth: 420,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
