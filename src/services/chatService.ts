import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentReference,
} from "firebase/firestore";

import type { ChatMessage } from "@/types/chatMessage";
import type { ChatThread } from "@/types/relation";
import { readErrorCode } from "@/utils/errorCode";

import { db } from "./firebase";

export const CHAT_TEXT_MAX = 1000;

export class ChatServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatServiceError";
  }
}

export function chatTextError(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "Écris un message.";
  }

  if (trimmed.length > CHAT_TEXT_MAX) {
    return "Le message ne peut pas dépasser 1 000 caractères.";
  }

  return null;
}

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

function mapChatMessage(id: string, data: Record<string, unknown>): ChatMessage {
  return {
    id,
    senderId: asText(data.senderId),
    text: asText(data.text),
    createdAt: asTimestamp(data.createdAt),
  };
}

export function createChatMessageRef(chatId: string) {
  return doc(collection(db, "chats", chatId, "messages"));
}

export async function sendChatMessage(
  messageRef: DocumentReference,
  senderId: string,
  text: string,
) {
  const trimmed = text.trim();
  const validationError = chatTextError(trimmed);

  if (validationError) {
    throw new ChatServiceError(validationError);
  }

  try {
    const existing = await getDoc(messageRef);

    if (existing.exists()) {
      return;
    }

    await setDoc(messageRef, {
      senderId,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (readErrorCode(error) === "permission-denied") {
      throw new ChatServiceError("L'envoi est réservé aux deux partenaires.");
    }

    throw new ChatServiceError("L'envoi a échoué. Ton message est conservé.");
  }
}

export function subscribeToChatMessages(
  chatId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: () => void,
) {
  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(50),
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onMessages(
        snapshot.docs
          .map((item) => mapChatMessage(item.id, item.data()))
          .reverse(),
      );
    },
    () => onError(),
  );
}
