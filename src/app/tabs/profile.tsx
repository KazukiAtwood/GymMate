import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayLabel, formatMinutes, levelLabel } from "@/constants/profileOptions";
import { ProfilePhotoEditor } from "@/components/ProfilePhotoEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { logoutAccount } from "@/services/authService";
import { getGym } from "@/services/gymService";

export default function ProfileTab() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const router = useRouter();
  const { user, profile } = useAuth();
  const { pending: signingOut, run: runLogout } = useSubmitLock();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [gymLabel, setGymLabel] = useState("à choisir ensuite");

  useEffect(() => {
    const gymId = profile?.gymId;

    if (!gymId) {
      setGymLabel("à choisir ensuite");
      return;
    }

    let active = true;
    setGymLabel(gymId);

    void getGym(gymId)
      .then((gym) => {
        if (!active || !gym) {
          return;
        }

        setGymLabel(`${gym.name} · ${gym.city}`);
      })
      .catch((loadError) => {
        console.error("Erreur de lecture de la salle :", loadError);
      });

    return () => {
      active = false;
    };
  }, [profile?.gymId]);

  function handleLogout() {
    setLogoutError(null);

    void runLogout(async () => {
      try {
        await logoutAccount();
      } catch (error) {
        console.error("Erreur de déconnexion :", error);
        setLogoutError("La déconnexion a échoué. Réessayez.");
      }
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{profile?.displayName || "Mon profil"}</Text>
      {user?.email ? <Text style={styles.account}>{user.email}</Text> : null}
      <View style={styles.toggle}>
        <ThemeToggle />
      </View>
      {user ? (
        <ProfilePhotoEditor uid={user.uid} displayName={profile?.displayName ?? ""} />
      ) : null}
      {profile?.gymId ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: "/gym", params: { mode: "position" } })
          }
        >
          <Text style={styles.link}>Utiliser ma position</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.line}>Ville : {profile?.city}</Text>
        <Text style={styles.line}>Niveau : {levelLabel(profile?.level ?? "")}</Text>
        <Text style={styles.line}>Objectif : {profile?.goal}</Text>
        <Text style={styles.line}>
          Sports : {profile?.sports.length ? profile.sports.join(", ") : "Aucun"}
        </Text>
        <Text style={styles.line}>
          Salle : {gymLabel}
        </Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <Text style={styles.section}>Disponibilités</Text>
      {profile?.availability.map((slot, index) => (
        <Text key={`${slot.day}-${slot.start}-${index}`} style={styles.slot}>
          {dayLabel(slot.day)} : {formatMinutes(slot.start)} - {formatMinutes(slot.end)}
        </Text>
      ))}

      {logoutError ? <Text style={styles.error}>{logoutError}</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => router.push("/profile")}
      >
        <Text style={styles.buttonText}>Modifier mon profil</Text>
      </Pressable>

      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={signingOut}
      >
        <Text style={styles.logoutText}>
          {signingOut ? "Déconnexion..." : "Se déconnecter"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },

  account: {
    marginTop: 6,
    color: colors.textMuted,
  },

  toggle: {
    marginTop: 16,
  },

  link: {
    marginTop: 16,
    color: colors.primary,
    fontWeight: "700",
  },

  card: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },

  line: {
    color: colors.text,
    fontSize: 16,
  },

  bio: {
    marginTop: 8,
    color: colors.textMuted,
    lineHeight: 22,
  },

  section: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },

  slot: {
    color: colors.infoText,
    backgroundColor: colors.infoSurface,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    fontWeight: "600",
  },

  error: {
    marginTop: 16,
    color: colors.danger,
  },

  button: {
    marginTop: 28,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  pressed: {
    opacity: 0.7,
  },

  buttonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  logoutButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },

  logoutText: {
    color: colors.danger,
    fontWeight: "700",
  },
});
}
