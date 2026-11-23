import { Redirect, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { RequestCard } from "@/components/RequestCard";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/services/profileService";
import {
    acceptTrainingRequest,
    listReceivedRequests,
    listSentRequests,
    rejectTrainingRequest,
    RequestServiceError,
} from "@/services/requestService";
import type { TrainingRequest } from "@/types/trainingRequest";
import { readErrorCode } from "@/utils/errorCode";
import { formatRequestSlot } from "@/utils/requestValidation";
import { isProfileReady } from "@/utils/profileValidation";

type RequestList = "received" | "sent";

export default function RequestsScreen() {
  const { user, profile } = useAuth();
  const { tab, notice } = useLocalSearchParams<{
    tab?: string;
    notice?: string;
  }>();
  const [mode, setMode] = useState<RequestList>(tab === "sent" ? "sent" : "received");
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "sent" || tab === "received") {
      setMode(tab);
    }
  }, [tab]);

  const loadRequests = useCallback(async (silent = false) => {
    if (!user) {
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const nextRequests =
        mode === "sent"
          ? await listSentRequests(user.uid)
          : await listReceivedRequests(user.uid);
      const partnerIds = [
        ...new Set(
          nextRequests.map((request) =>
            request.senderId === user.uid ? request.receiverId : request.senderId,
          ),
        ),
      ];
      const partnerNames = await Promise.all(
        partnerIds.map(async (partnerId) => {
          try {
            const partner = await getUserProfile(partnerId);
            return [partnerId, partner?.displayName || "Membre"] as const;
          } catch (loadError) {
            console.error("Erreur de lecture du partenaire :", loadError);
            return [partnerId, "Membre"] as const;
          }
        }),
      );

      setRequests(nextRequests);
      setNames(Object.fromEntries(partnerNames));
    } catch (loadError) {
      console.error("Erreur de lecture des demandes :", loadError);
      const code = readErrorCode(loadError);
      setError(
        code === "permission-denied"
          ? "Les demandes sont refusées. Publie les règles Firestore, puis réessaie."
          : "Les demandes sont indisponibles. Réessaie.",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [mode, user]);

  async function respond(requestId: string, decision: "accept" | "reject") {
    if (!user || respondingId) {
      return;
    }

    setRespondingId(requestId);
    setActionError(null);
    setActionNotice(null);

    try {
      const result =
        decision === "accept"
          ? await acceptTrainingRequest(requestId, user.uid)
          : await rejectTrainingRequest(requestId, user.uid);

      setActionNotice(
        result.status === "accepted"
          ? "Demande acceptée. La relation et la séance sont enregistrées."
          : "Demande refusée.",
      );
      await loadRequests(true);
    } catch (respondError) {
      console.error("Erreur de réponse à la demande :", respondError);
      setActionError(
        respondError instanceof RequestServiceError
          ? respondError.message
          : "La réponse n'a pas pu être enregistrée. Réessaie.",
      );
    } finally {
      setRespondingId(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demandes</Text>
      <View style={styles.switch}>
        <Pressable
          style={[styles.switchButton, mode === "received" && styles.switchButtonActive]}
          onPress={() => setMode("received")}
        >
          <Text style={[styles.switchText, mode === "received" && styles.switchTextActive]}>
            Reçues
          </Text>
        </Pressable>
        <Pressable
          style={[styles.switchButton, mode === "sent" && styles.switchButtonActive]}
          onPress={() => setMode("sent")}
        >
          <Text style={[styles.switchText, mode === "sent" && styles.switchTextActive]}>
            Envoyées
          </Text>
        </Pressable>
      </View>

      {notice === "already" ? (
        <Text style={styles.notice}>Cette demande avait déjà été envoyée.</Text>
      ) : null}
      {actionNotice ? <Text style={styles.notice}>{actionNotice}</Text> : null}
      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3C87F7" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void loadRequests()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.listView}
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>
              {mode === "sent"
                ? "Tu n'as envoyé aucune demande."
                : "Tu n'as reçu aucune demande."}
            </Text>
          }
          renderItem={({ item }) => {
            const partnerId =
              item.senderId === user?.uid ? item.receiverId : item.senderId;
            const slot =
              item.startsAt && item.endsAt
                ? formatRequestSlot(item.startsAt.toDate(), item.endsAt.toDate())
                : null;

            return (
              <RequestCard
                partnerName={names[partnerId] ?? "Membre"}
                sport={item.sport}
                date={slot?.date ?? "Date en cours de confirmation"}
                hours={slot?.hours ?? ""}
                status={item.status}
                message={item.message}
                canRespond={mode === "received" && item.status === "pending"}
                slotPassed={Boolean(item.startsAt && item.startsAt.toMillis() <= Date.now())}
                responding={respondingId === item.id}
                onAccept={() => void respond(item.id, "accept")}
                onReject={() => void respond(item.id, "reject")}
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

  notice: {
    marginBottom: 12,
    color: "#1E40AF",
    backgroundColor: "#E0ECFF",
    borderRadius: 12,
    padding: 12,
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
