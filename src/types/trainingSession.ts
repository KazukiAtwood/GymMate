import type { Timestamp } from "firebase/firestore";

export const SESSION_STATUSES = ["planned", "done", "cancelled"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type TrainingSession = {
  id: string;
  requestId: string;
  relationId: string;
  members: string[];
  gymId: string;
  sport: string;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  timeZone: string;
  status: SessionStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};
