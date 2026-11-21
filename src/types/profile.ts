import type { Timestamp } from "firebase/firestore";

export const SPORT_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type SportLevel = (typeof SPORT_LEVELS)[number];

export type AvailabilitySlot = {
  day: number;
  start: number;
  end: number;
};

export type SportProfile = {
  id: string;
  displayName: string;
  city: string;
  level: SportLevel | "";
  goal: string;
  sports: string[];
  availability: AvailabilitySlot[];
  bio: string;
  gymId: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type SportProfileInput = {
  displayName: string;
  city: string;
  level: SportLevel;
  goal: string;
  sports: string[];
  availability: AvailabilitySlot[];
  bio: string;
};
