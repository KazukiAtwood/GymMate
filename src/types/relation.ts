import type { Timestamp } from "firebase/firestore";

export type Relation = {
  id: string;
  members: string[];
  gymId: string;
  sourceRequestId: string;
  createdAt: Timestamp | null;
};

export type ChatThread = {
  id: string;
  relationId: string;
  members: string[];
  createdAt: Timestamp | null;
};
