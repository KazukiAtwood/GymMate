import type { SportLevel } from "@/types/profile";

export const LEVELS: { value: SportLevel; label: string }[] = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

export const SPORTS = [
  "Musculation",
  "Fitness",
  "Running",
  "Cardio",
  "CrossFit",
  "Boxe",
] as const;

export const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
] as const;

export function levelLabel(level: string) {
  return LEVELS.find((item) => item.value === level)?.label ?? "Non renseigné";
}

export function dayLabel(day: number) {
  return DAYS.find((item) => item.value === day)?.label ?? `Jour ${day}`;
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function parseClockToMinutes(value: string) {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);

  if (hours === 24) {
    return minutes === 0 ? 1440 : null;
  }

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatAvailabilitySummary(
  slots: { day: number; start: number; end: number }[],
) {
  if (slots.length === 0) {
    return "Disponibilités non renseignées";
  }

  const labels = slots.slice(0, 2).map(
    (slot) =>
      `${dayLabel(slot.day)} ${formatMinutes(slot.start)}-${formatMinutes(slot.end)}`,
  );

  if (slots.length > 2) {
    labels.push(`+${slots.length - 2}`);
  }

  return labels.join(" · ");
}
