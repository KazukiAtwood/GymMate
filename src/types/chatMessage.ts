import type { Timestamp } from "firebase/firestore";

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
};
