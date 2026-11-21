import { SPORTS } from "@/constants/profileOptions";
import {
    SPORT_LEVELS,
    type AvailabilitySlot,
    type SportLevel,
    type SportProfile,
} from "@/types/profile";

export const LIMITS = {
  displayNameMin: 2,
  displayNameMax: 40,
  cityMin: 2,
  cityMax: 60,
  goalMax: 80,
  bioMax: 280,
  passwordMin: 6,
  availabilityMax: 14,
} as const;

export type ProfileFieldErrors = Partial<
  Record<
    | "displayName"
    | "city"
    | "level"
    | "goal"
    | "sports"
    | "availability"
    | "bio",
    string
  >
>;

export type RegisterFieldErrors = Partial<
  Record<"displayName" | "email" | "password" | "confirmation", string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isSportLevel(value: string): value is SportLevel {
  return SPORT_LEVELS.some((level) => level === value);
}

export function isAllowedSport(value: string) {
  return (SPORTS as readonly string[]).includes(value);
}

export function validateRegister(input: {
  displayName: string;
  email: string;
  password: string;
  confirmation: string;
}) {
  const errors: RegisterFieldErrors = {};
  const displayName = cleanDisplayName(input.displayName);

  if (
    displayName.length < LIMITS.displayNameMin ||
    displayName.length > LIMITS.displayNameMax
  ) {
    errors.displayName = "Le nom doit contenir entre 2 et 40 caractères.";
  }

  if (!input.email.trim()) {
    errors.email = "L'adresse e-mail est requise.";
  } else if (!isValidEmail(input.email)) {
    errors.email = "L'adresse e-mail n'est pas valide.";
  }

  if (input.password.length < LIMITS.passwordMin) {
    errors.password = "Le mot de passe doit contenir au moins 6 caractères.";
  }

  if (input.confirmation !== input.password) {
    errors.confirmation = "La confirmation n'est pas identique au mot de passe.";
  }

  return errors;
}

export function validateLogin(input: { email: string; password: string }) {
  const errors: Partial<Record<"email" | "password", string>> = {};

  if (!input.email.trim()) {
    errors.email = "L'adresse e-mail est requise.";
  } else if (!isValidEmail(input.email)) {
    errors.email = "L'adresse e-mail n'est pas valide.";
  }

  if (!input.password) {
    errors.password = "Le mot de passe est requis.";
  }

  return errors;
}

function availabilityMessage(slots: AvailabilitySlot[]) {
  if (slots.length === 0) {
    return "Ajoutez au moins une disponibilité.";
  }

  if (slots.length > LIMITS.availabilityMax) {
    return "Vous pouvez enregistrer 14 disponibilités au maximum.";
  }

  const hasInvalidSlot = slots.some(
    (slot) =>
      !Number.isInteger(slot.day) ||
      slot.day < 1 ||
      slot.day > 7 ||
      !Number.isInteger(slot.start) ||
      !Number.isInteger(slot.end) ||
      slot.start < 0 ||
      slot.end > 1440 ||
      slot.start >= slot.end,
  );

  if (hasInvalidSlot) {
    return "Chaque disponibilité doit respecter : jour 1-7 et 0 ≤ début < fin ≤ 1440.";
  }

  return undefined;
}

export function validateSportProfile(input: {
  displayName: string;
  city: string;
  level: string;
  goal: string;
  sports: string[];
  availability: AvailabilitySlot[];
  bio: string;
}) {
  const errors: ProfileFieldErrors = {};
  const displayName = cleanDisplayName(input.displayName);
  const city = input.city.trim();
  const goal = input.goal.trim();

  if (
    displayName.length < LIMITS.displayNameMin ||
    displayName.length > LIMITS.displayNameMax
  ) {
    errors.displayName = "Le nom doit contenir entre 2 et 40 caractères.";
  }

  if (city.length < LIMITS.cityMin || city.length > LIMITS.cityMax) {
    errors.city = "La ville doit contenir entre 2 et 60 caractères.";
  }

  if (!isSportLevel(input.level)) {
    errors.level = "Choisissez un niveau.";
  }

  if (!goal) {
    errors.goal = "Indiquez votre objectif.";
  } else if (goal.length > LIMITS.goalMax) {
    errors.goal = "L'objectif ne peut pas dépasser 80 caractères.";
  }

  if (input.sports.length === 0) {
    errors.sports = "Sélectionnez au moins un sport.";
  } else if (input.sports.some((sport) => !isAllowedSport(sport))) {
    errors.sports = "Sélectionnez uniquement les sports proposés.";
  }

  const availabilityError = availabilityMessage(input.availability);

  if (availabilityError) {
    errors.availability = availabilityError;
  }

  if (input.bio.trim().length > LIMITS.bioMax) {
    errors.bio = "La bio ne peut pas dépasser 280 caractères.";
  }

  return errors;
}

export function isProfileReady(profile: SportProfile | null) {
  if (!profile) {
    return false;
  }

  return Object.keys(validateSportProfile(profile)).length === 0;
}

export function hasFieldErrors(errors: object) {
  return Object.keys(errors).length > 0;
}
