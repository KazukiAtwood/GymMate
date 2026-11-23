import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SessionCard } from "@/components/SessionCard";
import { useAuth } from "@/contexts/AuthContext";
import { getGym } from "@/services/gymService";
import { getUserProfile } from "@/services/profileService";
import {
    cancelSession,
    completeSession,
    listSessions,
    SessionServiceError,
} from "@/services/sessionService";
import type { TrainingSession } from "@/types/trainingSession";
import { readErrorCode } from "@/utils/errorCode";
import { isProfileReady } from "@/utils/profileValidation";
import { formatRequestSlot } from "@/utils/requestValidation";

type SessionList = "upcoming" | "history";

export default function SessionsScreen() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<SessionList>("upcoming");
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [gyms, setGyms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSessions = useCallback(async (silent = false) => {
    if (!user) {
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const nextSessions = await listSessions(user.uid);
      const partnerIds = [
        ...new Set(
          nextSessions.map(
            (session) => session.members.find((memberId) => memberId !== user.uid) ?? "",
          ),
        ),
      ].filter(Boolean);
      const gymIds = [...new Set(nextSessions.map((session) => session.gymId))];
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

      setSessions(nextSessions);
      setNames(Object.fromEntries(partnerNames));
      setGyms(Object.fromEntries(gymNames));
    } catch (loadError) {
      console.error("Erreur de lecture des séances :", loadError);
      const code = readErrorCode(loadError);
      setError(
        code === "permission-denied"
          ? "Les séances sont refusées. Publie les règles Firestore, puis réessaie."
          : "Les séances sont indisponibles. Réessaie.",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  async function updateSession(sessionId: string, action: "cancel" | "complete") {
    if (!user || pendingId) {
      return;
    }

    setPendingId(sessionId);
    setActionError(null);

    try {
      if (action === "cancel") {
        await cancelSession(sessionId, user.uid);
      } else {
        await completeSession(sessionId, user.uid);
      }

      await loadSessions(true);
    } catch (updateError) {
      console.error("Erreur de mise à jour de la séance :", updateError);
      setActionError(
        updateError instanceof SessionServiceError
          ? updateError.message
          : "La séance n'a pas pu être mise à jour. Réessaie.",
      );
    } finally {
      setPendingId(null);
    }
  }

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  const visibleSessions = sessions
    .filter((session) =>
      mode === "upcoming" ? session.status === "planned" : session.status !== "planned",
    )
    .sort((left, right) => {
      const leftTime = left.startsAt?.toMillis() ?? 0;
      const rightTime = right.startsAt?.toMillis() ?? 0;
      return mode === "upcoming" ? leftTime - rightTime : rightTime - leftTime;
    });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Séances</Text>
      <View style={styles.switch}>
        <Pressable
          style={[styles.switchButton, mode === "upcoming" && styles.switchButtonActive]}
          onPress={() => setMode("upcoming")}
        >
          <Text style={[styles.switchText, mode === "upcoming" && styles.switchTextActive]}>
            À venir
          </Text>
        </Pressable>
        <Pressable
          style={[styles.switchButton, mode === "history" && styles.switchButtonActive]}
          onPress={() => setMode("history")}
        >
          <Text style={[styles.switchText, mode === "history" && styles.switchTextActive]}>
            Historique
          </Text>
        </Pressable>
      </View>
      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3C87F7" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void loadSessions()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.listView}
          data={visibleSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>
              {mode === "upcoming"
                ? "Aucune séance à venir."
                : "Aucune séance dans l'historique."}
            </Text>
          }
          renderItem={({ item }) => {
            const partnerId = item.members.find((memberId) => memberId !== user?.uid) ?? "";
            const slot =
              item.startsAt && item.endsAt
                ? formatRequestSlot(item.startsAt.toDate(), item.endsAt.toDate())
                : null;

            return (
              <SessionCard
                partnerName={names[partnerId] ?? "Membre"}
                gymName={gyms[item.gymId] ?? item.gymId}
                sport={item.sport}
                date={slot?.date ?? "Date en cours de confirmation"}
                hours={slot?.hours ?? ""}
                status={item.status}
                canComplete={Boolean(item.endsAt && item.endsAt.toMillis() < Date.now())}
                pending={pendingId === item.id}
                onCancel={() => void updateSession(item.id, "cancel")}
                onComplete={() => void updateSession(item.id, "complete")}
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

  switch: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },

  switchButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  switchButtonActive: {
    backgroundColor: "#3C87F7",
    borderColor: "#3C87F7",
  },

  switchText: {
    color: "#374151",
    fontWeight: "700",
  },

  switchTextActive: {
    color: "#FFFFFF",
  },

  actionError: {
    marginBottom: 12,
    color: "#991B1B",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
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
