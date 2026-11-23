import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { RequestStatus } from "@/types/trainingRequest";

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Refusée",
};

type RequestCardProps = {
  partnerName: string;
  sport: string;
  date: string;
  hours: string;
  status: RequestStatus;
  message?: string;
  canRespond?: boolean;
  slotPassed?: boolean;
  responding?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
};

export function RequestCard({
  partnerName,
  sport,
  date,
  hours,
  status,
  message,
  canRespond = false,
  slotPassed = false,
  responding = false,
  onAccept,
  onReject,
}: RequestCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{partnerName}</Text>
        <Text style={[styles.badge, styles[status]]}>{STATUS_LABELS[status]}</Text>
      </View>
      <Text style={styles.line}>{sport}</Text>
      <Text style={styles.line}>{date}</Text>
      <Text style={styles.line}>{hours}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {canRespond && slotPassed ? (
        <Text style={styles.hint}>
          Ce créneau est passé. Tu peux refuser la demande. Un autre horaire demande une nouvelle
          proposition.
        </Text>
      ) : null}
      {canRespond ? (
        <View style={styles.actions}>
          {responding ? (
            <ActivityIndicator color="#3C87F7" />
          ) : (
            <>
              {slotPassed ? null : (
                <Pressable style={styles.accept} onPress={onAccept}>
                  <Text style={styles.acceptText}>Accepter</Text>
                </Pressable>
              )}
              <Pressable style={styles.reject} onPress={onReject}>
                <Text style={styles.rejectText}>Refuser</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },

  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  badge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  pending: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },

  accepted: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },

  rejected: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },

  line: {
    marginTop: 4,
    color: "#4B5563",
  },

  message: {
    marginTop: 10,
    color: "#1F2937",
    lineHeight: 20,
  },

  hint: {
    marginTop: 12,
    color: "#92400E",
    lineHeight: 20,
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },

  accept: {
    flex: 1,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  acceptText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  reject: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
  },

  rejectText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});
