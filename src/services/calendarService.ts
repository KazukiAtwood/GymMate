import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export class CalendarServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarServiceError";
  }
}

export type CalendarWriteResult =
  | { status: "none" }
  | { status: "created"; sessionId: string; eventId: string }
  | { status: "already"; sessionId: string; eventId: string };

type SessionCalendarEvent = {
  uid: string;
  sessionId: string;
  title: string;
  location: string;
  notes: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
};

type PendingCalendarEvent = {
  uid: string;
  sessionId: string;
  title: string;
  location: string;
  notes: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
};

let calendarQueue: Promise<unknown> = Promise.resolve();

function calendarKey(uid: string, sessionId: string) {
  return `calendar:${uid}:${sessionId}`;
}

function pendingKey(uid: string) {
  return `calendar-pending:${uid}`;
}

function enqueue<T>(task: () => Promise<T>) {
  const run = calendarQueue.then(task, task);
  calendarQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getSessionCalendarEventId(uid: string, sessionId: string) {
  return AsyncStorage.getItem(calendarKey(uid, sessionId));
}

async function readPending(uid: string) {
  const raw = await AsyncStorage.getItem(pendingKey(uid));

  if (!raw) {
    return null;
  }

  try {
    const pending = JSON.parse(raw) as PendingCalendarEvent;

    if (!pending.sessionId || !pending.startsAt || !pending.endsAt) {
      await AsyncStorage.removeItem(pendingKey(uid));
      return null;
    }

    return pending;
  } catch (error) {
    console.error("Erreur de lecture du calendrier en attente :", error);
    await AsyncStorage.removeItem(pendingKey(uid));
    return null;
  }
}

async function createPendingEvent(pending: PendingCalendarEvent): Promise<CalendarWriteResult> {
  const key = calendarKey(pending.uid, pending.sessionId);
  const existing = await AsyncStorage.getItem(key);

  if (existing) {
    await AsyncStorage.removeItem(pendingKey(pending.uid));
    return { status: "already", sessionId: pending.sessionId, eventId: existing };
  }

  const Calendar = await import("expo-calendar/legacy");
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);
  const target = writable.find((calendar) => calendar.isPrimary) ?? writable[0];

  if (!target?.id) {
    await AsyncStorage.removeItem(pendingKey(pending.uid));
    throw new CalendarServiceError(
      "Aucun calendrier modifiable n'est disponible. Ajoute un compte sur le téléphone, puis réessaie.",
    );
  }

  const startsAt = new Date(pending.startsAt);
  const endsAt = new Date(pending.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    await AsyncStorage.removeItem(pendingKey(pending.uid));
    throw new CalendarServiceError("Les horaires de la séance ne peuvent pas être ajoutés.");
  }

  const eventId = await Calendar.createEventAsync(target.id, {
    title: pending.title,
    location: pending.location,
    notes: pending.notes,
    startDate: startsAt,
    endDate: endsAt,
    timeZone: pending.timeZone || "Europe/Paris",
  });

  await AsyncStorage.setItem(key, eventId);
  await AsyncStorage.removeItem(pendingKey(pending.uid));
  return { status: "created", sessionId: pending.sessionId, eventId };
}

export function addSessionToCalendar(event: SessionCalendarEvent) {
  return enqueue(async (): Promise<CalendarWriteResult> => {
    if (Platform.OS === "web") {
      throw new CalendarServiceError("L'ajout au calendrier se fait sur le téléphone.");
    }

    const pending: PendingCalendarEvent = {
      uid: event.uid,
      sessionId: event.sessionId,
      title: event.title,
      location: event.location,
      notes: event.notes,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timeZone: event.timeZone || "Europe/Paris",
    };
    await AsyncStorage.setItem(pendingKey(event.uid), JSON.stringify(pending));

    const Calendar = await import("expo-calendar/legacy");
    const current = await Calendar.getCalendarPermissionsAsync();
    const permission = current.granted
      ? current
      : await Calendar.requestCalendarPermissionsAsync();

    if (!permission.granted) {
      await AsyncStorage.removeItem(pendingKey(event.uid));
      throw new CalendarServiceError(
        "Le calendrier est désactivé. Tu peux continuer sans l'ajouter.",
      );
    }

    return createPendingEvent(pending);
  });
}

export function resumePendingCalendarEvent(uid: string) {
  return enqueue(async (): Promise<CalendarWriteResult> => {
    if (Platform.OS === "web") {
      return { status: "none" };
    }

    const pending = await readPending(uid);

    if (!pending) {
      return { status: "none" };
    }

    const Calendar = await import("expo-calendar/legacy");
    const permission = await Calendar.getCalendarPermissionsAsync();

    if (!permission.granted) {
      return { status: "none" };
    }

    return createPendingEvent(pending);
  });
}

export function removeSessionFromCalendar(uid: string, sessionId: string) {
  return enqueue(async () => {
    const key = calendarKey(uid, sessionId);
    const eventId = await AsyncStorage.getItem(key);
    const pending = await readPending(uid);

    if (pending?.sessionId === sessionId) {
      await AsyncStorage.removeItem(pendingKey(uid));
    }

    if (!eventId) {
      return false;
    }

    if (Platform.OS !== "web") {
      try {
        const Calendar = await import("expo-calendar/legacy");
        await Calendar.deleteEventAsync(eventId);
      } catch (error) {
        console.error("Erreur de suppression de l'événement :", error);
      }
    }

    await AsyncStorage.removeItem(key);
    return true;
  });
}
