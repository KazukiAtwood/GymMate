import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
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
  const colors = useTheme();
  const styles = createStyles(colors);

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
          <ActivityIndicator size="large" color={colors.primary} />
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  switchButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  switchText: {
    color: colors.text,
    fontWeight: "700",
  },

  switchTextActive: {
    color: colors.onPrimary,
  },

  notice: {
    marginBottom: 12,
    color: colors.infoText,
    backgroundColor: colors.infoSurface,
    borderRadius: 12,
    padding: 12,
  },

  actionError: {
    marginBottom: 12,
    color: colors.danger,
    backgroundColor: colors.dangerSurface,
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
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  retry: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  retryText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
});
}
