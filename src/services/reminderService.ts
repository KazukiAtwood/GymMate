import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const REMINDER_LEAD_MS = 15 * 60 * 1000;

export class ReminderServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReminderServiceError";
  }
}

export function reminderKey(uid: string, sessionId: string) {
  return `reminder:${uid}:${sessionId}`;
}

function isMissingChannelProvider(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("NotificationsChannelsProvider");
}

async function ensureSportChannel() {
  if (Platform.OS !== "android") {
    return false;
  }

  try {
    await Notifications.setNotificationChannelAsync("sport", {
      name: "Rappels",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    return true;
  } catch (error) {
    if (!isMissingChannelProvider(error)) {
      console.error("Erreur de création du canal de rappel :", error);
    }
    return false;
  }
}

async function dropScheduledReminder(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
  const remaining = await Notifications.getAllScheduledNotificationsAsync();

  if (remaining.some((notification) => notification.identifier === notificationId)) {
    throw new ReminderServiceError("Le rappel est encore programmé. Réessaie.");
  }
}

export async function getSessionReminderId(uid: string, sessionId: string) {
  return AsyncStorage.getItem(reminderKey(uid, sessionId));
}

export async function scheduleSessionReminder(
  uid: string,
  sessionId: string,
  startsAt: Date,
) {
  if (Platform.OS === "web") {
    throw new ReminderServiceError("Le rappel se programme sur le téléphone.");
  }

  const when = new Date(startsAt.getTime() - REMINDER_LEAD_MS);

  if (when.getTime() <= Date.now()) {
    throw new ReminderServiceError(
      "Ce rappel serait déjà passé. La séance commence dans moins de 15 minutes.",
    );
  }

  const sportChannelReady = await ensureSportChannel();
  const permission = await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    throw new ReminderServiceError(
      "Les notifications sont désactivées. Tu peux continuer sans rappel.",
    );
  }

  await cancelSessionReminder(uid, sessionId);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Entraînement",
      body: "Ta séance approche",
      data: { sessionId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      ...(sportChannelReady ? { channelId: "sport" } : {}),
    },
  });

  await AsyncStorage.setItem(reminderKey(uid, sessionId), id);
  return id;
}

export async function cancelSessionReminder(uid: string, sessionId: string) {
  const key = reminderKey(uid, sessionId);
  const existing = await AsyncStorage.getItem(key);

  if (!existing) {
    return false;
  }

  if (Platform.OS !== "web") {
    await dropScheduledReminder(existing);
  }

  await AsyncStorage.removeItem(key);
  return true;
}

export async function clearAccountReminders(uid: string) {
  const keys = await AsyncStorage.getAllKeys();
  const ownKeys = keys.filter((key) => key.startsWith(`reminder:${uid}:`));

  await Promise.all(
    ownKeys.map(async (key) => {
      const notificationId = await AsyncStorage.getItem(key);

      if (notificationId && Platform.OS !== "web") {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (error) {
          console.error("Erreur d'annulation d'un rappel :", error);
        }
      }

      await AsyncStorage.removeItem(key);
    }),
  );
}
