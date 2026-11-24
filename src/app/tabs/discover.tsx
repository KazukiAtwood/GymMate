import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { MemberCard } from "@/components/MemberCard";
import {
    formatAvailabilitySummary,
    levelLabel,
} from "@/constants/profileOptions";
import { useAuth } from "@/contexts/AuthContext";
import { getGym } from "@/services/gymService";
import { listGymMembers } from "@/services/profileService";
import type { SportProfile } from "@/types/profile";
import { readErrorCode } from "@/utils/errorCode";

export default function DiscoverScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const router = useRouter();
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<SportProfile[]>([]);
  const [gymName, setGymName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!user || !profile?.gymId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextMembers, gym] = await Promise.all([
        listGymMembers(profile.gymId, user.uid),
        getGym(profile.gymId),
      ]);

      setMembers(nextMembers);
      setGymName(gym ? `${gym.name} · ${gym.city}` : "");
    } catch (loadError) {
      console.error("Erreur de lecture des membres :", loadError);
      const code = readErrorCode(loadError);

      if (code === "permission-denied") {
        setError(
          "La lecture des membres a été refusée. Publiez les règles Firestore, puis réessayez.",
        );
      } else if (code === "unavailable" || code === "deadline-exceeded") {
        setError("Connexion réseau impossible. Réessayez.");
      } else {
        setError("Les membres sont indisponibles. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.gymId, user]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Découvrir</Text>
      <Text style={styles.subtitle}>
        {gymName || "Les sportifs de ta salle"}
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.button} onPress={() => void loadMembers()}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.listView}
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.message}>
                Tu es seul dans cette salle pour le moment. Reviens plus tard
                ou recharge la liste.
              </Text>
              <Pressable style={styles.button} onPress={() => void loadMembers()}>
                <Text style={styles.buttonText}>Recharger</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <MemberCard
              name={item.displayName}
              level={levelLabel(item.level)}
              goal={item.goal}
              availability={formatAvailabilitySummary(item.availability)}
              onPress={() =>
                router.push({
                  pathname: "/members/[userId]",
                  params: { userId: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },

  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 24,
  },

  list: {
    gap: 16,
    paddingBottom: 24,
  },

  listView: {
    flex: 1,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  empty: {
    alignItems: "center",
    paddingTop: 24,
  },

  message: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  button: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  buttonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
});
}
