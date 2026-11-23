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
import {
    addSessionToCalendar,
    CalendarServiceError,
    getSessionCalendarEventId,
    removeSessionFromCalendar,
    resumePendingCalendarEvent,
} from "@/services/calendarService";
import {
    cancelSessionReminder,
    getSessionReminderId,
    ReminderServiceError,
    scheduleSessionReminder,
} from "@/services/reminderService";
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
  const [reminderIds, setReminderIds] = useState<Record<string, string>>({});
  const [reminderPendingId, setReminderPendingId] = useState<string | null>(null);
  const [calendarIds, setCalendarIds] = useState<Record<string, string>>({});
  const [calendarPendingId, setCalendarPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

      const [storedReminders, storedCalendarEvents] = await Promise.all([
        Promise.all(
          nextSessions.map(async (session) => {
            const reminderId = await getSessionReminderId(user.uid, session.id);
            return [session.id, reminderId] as const;
          }),
        ),
        Promise.all(
          nextSessions.map(async (session) => {
            const eventId = await getSessionCalendarEventId(user.uid, session.id);
            return [session.id, eventId] as const;
          }),
        ),
      ]);
      setReminderIds(
        Object.fromEntries(
          storedReminders.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
        ),
      );
      setCalendarIds(
        Object.fromEntries(
          storedCalendarEvents.filter((entry): entry is readonly [string, string] =>
            Boolean(entry[1]),
          ),
        ),
      );
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
      let active = true;

      void (async () => {
        await loadSessions();

        if (!user || !active) {
          return;
        }

        try {
          const result = await resumePendingCalendarEvent(user.uid);

          if (!active || result.status === "none") {
            return;
          }

          setCalendarIds((current) => ({ ...current, [result.sessionId]: result.eventId }));

          if (result.status === "created") {
            setActionNotice("Séance ajoutée au calendrier.");
          }
        } catch (calendarError) {
          if (!active) {
            return;
          }

          console.error("Erreur d'ajout au calendrier :", calendarError);
          setActionError(
            calendarError instanceof CalendarServiceError
              ? calendarError.message
              : "La séance n'a pas pu être ajoutée au calendrier. Réessaie.",
          );
        }
      })();

      return () => {
        active = false;
      };
    }, [loadSessions, user]),
  );

  async function updateSession(sessionId: string, action: "cancel" | "complete") {
    if (!user || pendingId) {
      return;
    }

    setPendingId(sessionId);
    setActionError(null);
    setActionNotice(null);

    try {
      if (action === "cancel") {
        await cancelSession(sessionId, user.uid);
      } else {
        await completeSession(sessionId, user.uid);
      }

      try {
        await cancelSessionReminder(user.uid, sessionId);
        setReminderIds((current) => {
          const next = { ...current };
          delete next[sessionId];
          return next;
        });
      } catch (reminderError) {
        console.error("Erreur d'annulation du rappel :", reminderError);
      }

      if (action === "cancel") {
        try {
          await removeSessionFromCalendar(user.uid, sessionId);
          setCalendarIds((current) => {
            const next = { ...current };
            delete next[sessionId];
            return next;
          });
        } catch (calendarError) {
          console.error("Erreur de retrait du calendrier :", calendarError);
        }
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

  async function changeReminder(sessionId: string, startsAt: Date, scheduled: boolean) {
    if (!user || reminderPendingId) {
      return;
    }

    setReminderPendingId(sessionId);
    setActionError(null);
    setActionNotice(null);

    try {
      if (scheduled) {
        await cancelSessionReminder(user.uid, sessionId);
        setReminderIds((current) => {
          const next = { ...current };
          delete next[sessionId];
          return next;
        });
        setActionNotice("Rappel annulé.");
      } else {
        const reminderId = await scheduleSessionReminder(user.uid, sessionId, startsAt);
        setReminderIds((current) => ({ ...current, [sessionId]: reminderId }));
        setActionNotice("Rappel programmé 15 minutes avant la séance.");
      }
    } catch (reminderError) {
      console.error("Erreur de rappel :", reminderError);
      setActionError(
        reminderError instanceof ReminderServiceError
          ? reminderError.message
          : "Le rappel n'a pas pu être modifié. Réessaie.",
      );
    } finally {
      setReminderPendingId(null);
    }
  }

  async function addToCalendar(session: TrainingSession, partnerName: string, gymName: string) {
    if (!user || !session.startsAt || !session.endsAt || calendarPendingId) {
      return;
    }

    setCalendarPendingId(session.id);
    setActionError(null);
    setActionNotice(null);

    try {
      const result = await addSessionToCalendar({
        uid: user.uid,
        sessionId: session.id,
        title: `Entraînement ${session.sport}`,
        location: gymName,
        notes: `Avec ${partnerName}`,
        startsAt: session.startsAt.toDate(),
        endsAt: session.endsAt.toDate(),
        timeZone: session.timeZone || "Europe/Paris",
      });

      if (result.status === "none") {
        return;
      }

      setCalendarIds((current) => ({ ...current, [result.sessionId]: result.eventId }));
      setActionNotice(
        result.status === "already"
          ? "Cette séance est déjà dans ton calendrier."
          : "Séance ajoutée au calendrier.",
      );
    } catch (calendarError) {
      console.error("Erreur d'ajout au calendrier :", calendarError);
      setActionError(
        calendarError instanceof CalendarServiceError
          ? calendarError.message
          : "La séance n'a pas pu être ajoutée au calendrier. Réessaie.",
      );
    } finally {
      setCalendarPendingId(null);
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
      {actionNotice ? <Text style={styles.notice}>{actionNotice}</Text> : null}
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

            const startsAt = item.startsAt?.toDate() ?? null;
            const upcoming = Boolean(startsAt && startsAt.getTime() > Date.now());

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
                reminderScheduled={Boolean(reminderIds[item.id])}
                reminderPending={reminderPendingId === item.id}
                onCancel={() => void updateSession(item.id, "cancel")}
                onComplete={() => void updateSession(item.id, "complete")}
                onScheduleReminder={
                  upcoming && startsAt
                    ? () => void changeReminder(item.id, startsAt, false)
                    : undefined
                }
                onCancelReminder={
                  upcoming && startsAt
                    ? () => void changeReminder(item.id, startsAt, true)
                    : undefined
                }
                calendarAdded={Boolean(calendarIds[item.id])}
                calendarPending={calendarPendingId === item.id}
                onAddToCalendar={
                  item.startsAt && item.endsAt
                    ? () =>
                        void addToCalendar(
                          item,
                          names[partnerId] ?? "Membre",
                          gyms[item.gymId] ?? item.gymId,
                        )
                    : undefined
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

  notice: {
    marginBottom: 12,
    color: "#1E40AF",
    backgroundColor: "#E0ECFF",
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
