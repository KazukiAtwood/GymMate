import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";

import type { SessionStatus, TrainingSession } from "@/types/trainingSession";
import { readErrorCode } from "@/utils/errorCode";

import { db } from "./firebase";

export class SessionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionServiceError";
  }
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
    return value as TrainingSession["startsAt"];
  }

  return null;
}

function mapMembers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function mapStatus(value: unknown): SessionStatus {
  if (value === "planned" || value === "done" || value === "cancelled") {
    return value;
  }

  return "planned";
}

export function mapTrainingSession(
  id: string,
  data: Record<string, unknown>,
): TrainingSession {
  return {
    id,
    requestId: asText(data.requestId),
    relationId: asText(data.relationId),
    members: mapMembers(data.members),
    gymId: asText(data.gymId),
    sport: asText(data.sport),
    startsAt: asTimestamp(data.startsAt),
    endsAt: asTimestamp(data.endsAt),
    timeZone: asText(data.timeZone),
    status: mapStatus(data.status),
    createdAt: asTimestamp(data.createdAt),
    updatedAt: asTimestamp(data.updatedAt),
  };
}

export async function listSessions(uid: string) {
  const snapshot = await getDocs(
    query(collection(db, "trainingSessions"), where("members", "array-contains", uid)),
  );

  return snapshot.docs
    .map((session) => mapTrainingSession(session.id, session.data()))
    .sort((left, right) => {
      const leftTime = left.startsAt?.toMillis() ?? 0;
      const rightTime = right.startsAt?.toMillis() ?? 0;
      return leftTime - rightTime;
    });
}

async function readSession(sessionId: string) {
  const snapshot = await getDoc(doc(db, "trainingSessions", sessionId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapTrainingSession(snapshot.id, snapshot.data());
}

function failureMessage(error: unknown, fallback: string) {
  const code = readErrorCode(error);

  if (code === "permission-denied") {
    return "La séance n'a pas pu être mise à jour. Publie les règles Firestore, puis réessaie.";
  }

  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Connexion réseau impossible. Réessaie.";
  }

  console.error("Erreur de mise à jour de la séance :", error);
  return fallback;
}

export async function cancelSession(sessionId: string, uid: string) {
  const session = await readSession(sessionId);

  if (!session || !session.members.includes(uid)) {
    throw new SessionServiceError("Cette séance est introuvable.");
  }

  if (session.status === "cancelled") {
    return session;
  }

  if (session.status !== "planned") {
    throw new SessionServiceError("Cette séance ne peut plus être modifiée.");
  }

  try {
    await updateDoc(doc(db, "trainingSessions", sessionId), {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const again = await readSession(sessionId);

    if (again?.status === "cancelled") {
      return again;
    }

    throw new SessionServiceError(
      failureMessage(error, "L'annulation a échoué. Réessaie."),
    );
  }

  return { ...session, status: "cancelled" as const };
}

export async function completeSession(sessionId: string, uid: string) {
  const session = await readSession(sessionId);

  if (!session || !session.members.includes(uid)) {
    throw new SessionServiceError("Cette séance est introuvable.");
  }

  if (session.status === "done") {
    return session;
  }

  if (session.status !== "planned") {
    throw new SessionServiceError("Cette séance ne peut plus être modifiée.");
  }

  if (!session.endsAt || session.endsAt.toMillis() >= Date.now()) {
    throw new SessionServiceError(
      "Tu pourras indiquer la séance comme terminée après l'heure de fin.",
    );
  }

  try {
    await updateDoc(doc(db, "trainingSessions", sessionId), {
      status: "done",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const again = await readSession(sessionId);

    if (again?.status === "done") {
      return again;
    }

    throw new SessionServiceError(
      failureMessage(error, "La séance n'a pas pu être terminée. Réessaie."),
    );
  }

  return { ...session, status: "done" as const };
}
