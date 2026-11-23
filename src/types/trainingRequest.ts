import type { Timestamp } from "firebase/firestore";

export const REQUEST_STATUSES = ["pending", "accepted", "rejected"] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_TIME_ZONE = "Europe/Paris";

export type TrainingRequest = {
  id: string;
  senderId: string;
  receiverId: string;
  members: string[];
  gymId: string;
  sport: string;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  timeZone: string;
  message: string;
  status: RequestStatus;
  createdAt: Timestamp | null;
  respondedAt: Timestamp | null;
};

export type TrainingRequestInput = {
  senderId: string;
  receiverId: string;
  sport: string;
  startsAt: Date;
  endsAt: Date;
  message: string;
};
