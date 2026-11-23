import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { RelationCard } from "@/components/RelationCard";
import { useAuth } from "@/contexts/AuthContext";
import { getGym } from "@/services/gymService";
import { getUserProfile } from "@/services/profileService";
import { listRelations } from "@/services/relationService";
import type { Relation } from "@/types/relation";
import { readErrorCode } from "@/utils/errorCode";
import { isProfileReady } from "@/utils/profileValidation";

export default function RelationsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [gyms, setGyms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRelations = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextRelations = await listRelations(user.uid);
      const partnerIds = [
        ...new Set(
          nextRelations.map(
            (relation) => relation.members.find((memberId) => memberId !== user.uid) ?? "",
          ),
        ),
      ].filter(Boolean);
      const gymIds = [...new Set(nextRelations.map((relation) => relation.gymId))];
      const [partnerNames, gymNames] = await Promise.all([
        Promise.all(
          partnerIds.map(async (partnerId) => {
            try {
              const partner = await getUserProfile(partnerId);
              return [partnerId, partner?.displayName || "Membre"] as const;
            } catch (loadError) {
              console.error("Erreur de lecture du partenaire :", loadError);
              return [partnerId, "Membre"] as const;
            }
          }),
        ),
        Promise.all(
          gymIds.map(async (gymId) => {
            try {
              const gym = await getGym(gymId);
              return [gymId, gym ? `${gym.name} · ${gym.city}` : gymId] as const;
            } catch (loadError) {
              console.error("Erreur de lecture de la salle :", loadError);
              return [gymId, gymId] as const;
            }
          }),
        ),
      ]);

      setRelations(nextRelations);
      setNames(Object.fromEntries(partnerNames));
      setGyms(Object.fromEntries(gymNames));
    } catch (loadError) {
      console.error("Erreur de lecture des relations :", loadError);
      const code = readErrorCode(loadError);
      setError(
        code === "permission-denied"
          ? "Les relations sont refusées. Publie les règles Firestore, puis réessaie."
          : "Les relations sont indisponibles. Réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadRelations();
    }, [loadRelations]),
  );

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relations</Text>
      <Text style={styles.subtitle}>Les partenaires avec qui une séance a été acceptée.</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3C87F7" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void loadRelations()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.listView}
          data={relations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>
              Aucune relation pour le moment. Elle apparaît quand une demande est acceptée.
            </Text>
          }
          renderItem={({ item }) => {
            const partnerId = item.members.find((memberId) => memberId !== user?.uid) ?? "";

            return (
              <RelationCard
                partnerName={names[partnerId] ?? "Membre"}
                gymName={gyms[item.gymId] ?? item.gymId}
                onOpenChat={() =>
                  router.push({
                    pathname: "/chats/[chatId]",
                    params: { chatId: item.id },
                  })
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: 64,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    color: "#6B7280",
    lineHeight: 20,
  },

  listView: {
    flex: 1,
  },

  list: {
    gap: 12,
    paddingBottom: 24,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  message: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  retry: {
    marginTop: 16,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
