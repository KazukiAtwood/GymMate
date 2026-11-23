import { doc, getDoc } from "firebase/firestore";

import type { ChatThread } from "@/types/relation";

import { db } from "./firebase";

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asTimestamp(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value as ChatThread["createdAt"];
  }

  return null;
}

function mapMembers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function mapChat(id: string, data: Record<string, unknown>): ChatThread {
  return {
    id,
    relationId: asText(data.relationId),
    members: mapMembers(data.members),
    createdAt: asTimestamp(data.createdAt),
  };
}

export async function getChat(chatId: string) {
  const snapshot = await getDoc(doc(db, "chats", chatId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapChat(snapshot.id, snapshot.data());
}
