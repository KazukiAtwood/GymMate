import { SPORTS } from "@/constants/profileOptions";

export const REQUEST_MESSAGE_MAX = 500;

export type RequestFieldErrors = Partial<
  Record<"sport" | "date" | "start" | "end" | "message", string>
>;

export type RequestSlot = {
  startsAt: Date;
  endsAt: Date;
};

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function buildRequestSlot(date: string, start: string, end: string) {
  const parsedDate = parseDate(date);
  const parsedStart = parseTime(start);
  const parsedEnd = parseTime(end);

  if (!parsedDate || !parsedStart || !parsedEnd) {
    return null;
  }

  const startsAt = new Date(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedStart.hours,
    parsedStart.minutes,
    0,
    0,
  );
  const endsAt = new Date(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedEnd.hours,
    parsedEnd.minutes,
    0,
    0,
  );

  return { startsAt, endsAt };
}

export function validateTrainingRequest(input: {
  sport: string;
  date: string;
  start: string;
  end: string;
  message: string;
  now?: Date;
}) {
  const errors: RequestFieldErrors = {};
  const now = input.now ?? new Date();
  const allowedSports: readonly string[] = SPORTS;

  if (!allowedSports.includes(input.sport)) {
    errors.sport = "Choisis un sport proposé par GymMate.";
  }

  if (!parseDate(input.date)) {
    errors.date = "Indique la date au format JJ/MM/AAAA.";
  }

  if (!parseTime(input.start)) {
    errors.start = "Indique l'heure de début au format HH:MM.";
  }

  if (!parseTime(input.end)) {
    errors.end = "Indique l'heure de fin au format HH:MM.";
  }

  const slot =
    errors.date || errors.start || errors.end
      ? null
      : buildRequestSlot(input.date, input.start, input.end);

  if (slot && slot.endsAt <= slot.startsAt) {
    errors.end = "L'heure de fin doit être après l'heure de début.";
  } else if (slot && slot.startsAt <= now) {
    errors.start = "Le début doit être dans le futur.";
  }

  if (input.message.trim().length > REQUEST_MESSAGE_MAX) {
    errors.message = "Le message ne peut pas dépasser 500 caractères.";
  }

  return errors;
}

export function formatRequestSlot(startsAt: Date, endsAt: Date) {
  const date = startsAt.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const start = startsAt.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = endsAt.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date, hours: `${start} – ${end}` };
}
