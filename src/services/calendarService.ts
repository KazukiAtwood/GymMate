import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export class CalendarServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarServiceError";
  }
}

function calendarKey(uid: string, sessionId: string) {
  return `calendar:${uid}:${sessionId}`;
}

export async function getSessionCalendarEventId(uid: string, sessionId: string) {
  return AsyncStorage.getItem(calendarKey(uid, sessionId));
}

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

export async function addSessionToCalendar(event: SessionCalendarEvent) {
  if (Platform.OS === "web") {
    throw new CalendarServiceError("L'ajout au calendrier se fait sur le téléphone.");
  }

  const key = calendarKey(event.uid, event.sessionId);
  const existing = await AsyncStorage.getItem(key);

  if (existing) {
    return "already" as const;
  }

  const Calendar = await import("expo-calendar");
  const permission = await Calendar.requestCalendarPermissions();

  if (!permission.granted) {
    throw new CalendarServiceError(
      "Le calendrier est désactivé. Tu peux continuer sans l'ajouter.",
    );
  }

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);
  const target = writable.find((calendar) => calendar.isPrimary) ?? writable[0];

  if (!target) {
    throw new CalendarServiceError("Aucun calendrier modifiable n'est disponible.");
  }

  const created = await target.createEvent({
    title: event.title,
    location: event.location,
    notes: event.notes,
    startDate: event.startsAt,
    endDate: event.endsAt,
    timeZone: event.timeZone || "Europe/Paris",
    allDay: false,
  });

  if (!created.id) {
    throw new CalendarServiceError("La séance n'a pas pu être ajoutée au calendrier.");
  }

  await AsyncStorage.setItem(key, created.id);
  return "created" as const;
}

export async function removeSessionFromCalendar(uid: string, sessionId: string) {
  const key = calendarKey(uid, sessionId);
  const eventId = await AsyncStorage.getItem(key);

  if (!eventId) {
    return false;
  }

  if (Platform.OS !== "web") {
    try {
      const Calendar = await import("expo-calendar");
      const calendarEvent = await Calendar.ExpoCalendarEvent.get(eventId);
      await calendarEvent.delete();
    } catch (error) {
      console.error("Erreur de suppression de l'événement :", error);
    }
  }

  await AsyncStorage.removeItem(key);
  return true;
}
