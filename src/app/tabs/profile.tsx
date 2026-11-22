import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayLabel, formatMinutes, levelLabel } from "@/constants/profileOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { logoutAccount } from "@/services/authService";
import { getGym } from "@/services/gymService";

export default function ProfileTab() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },

  account: {
    marginTop: 6,
    color: "#6B7280",
  },

  card: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },

  line: {
    color: "#1F2937",
    fontSize: 16,
  },

  bio: {
    marginTop: 8,
    color: "#4B5563",
    lineHeight: 22,
  },

  section: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  slot: {
    color: "#1E40AF",
    backgroundColor: "#E0ECFF",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    fontWeight: "600",
  },

  error: {
    marginTop: 16,
    color: "#B91C1C",
  },

  button: {
    marginTop: 28,
    backgroundColor: "#3C87F7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  pressed: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  logoutButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },

  logoutText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});
