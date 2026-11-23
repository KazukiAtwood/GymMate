import {
    Timestamp,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where,
    type DocumentReference,
} from "firebase/firestore";

import { SPORTS } from "@/constants/profileOptions";
import {
    REQUEST_TIME_ZONE,
    type RequestStatus,
    type TrainingRequest,
    type TrainingRequestInput,
} from "@/types/trainingRequest";
import { readErrorCode } from "@/utils/errorCode";
import { REQUEST_MESSAGE_MAX } from "@/utils/requestValidation";

import { db } from "./firebase";
import { getUserProfile } from "./profileService";

export class RequestServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestServiceError";
  }
}

export type SendTrainingRequestResult =
  | { status: "created"; id: string }
  | { status: "already-exists"; id: string };

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
    return value as TrainingRequest["createdAt"];
  }

  return null;
}

function mapStatus(value: unknown): RequestStatus {
  if (value === "pending" || value === "accepted" || value === "rejected") {
    return value;
  }

  return "pending";
}

function mapMembers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function mapTrainingRequest(
  id: string,
  data: Record<string, unknown>,
): TrainingRequest {
  return {
    id,
    senderId: asText(data.senderId),
    receiverId: asText(data.receiverId),
    members: mapMembers(data.members),
    gymId: asText(data.gymId),
    sport: asText(data.sport),
    startsAt: asTimestamp(data.startsAt),
    endsAt: asTimestamp(data.endsAt),
    timeZone: asText(data.timeZone),
    message: asText(data.message),
    status: mapStatus(data.status),
    createdAt: asTimestamp(data.createdAt),
    respondedAt: asTimestamp(data.respondedAt),
  };
}

export function createTrainingRequestRef() {
  return doc(collection(db, "trainingRequests"));
}

async function readExistingRequest(requestRef: DocumentReference) {
  const snapshot = await getDoc(requestRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapTrainingRequest(snapshot.id, snapshot.data());
}

export async function sendTrainingRequest(
  requestRef: DocumentReference,
  input: TrainingRequestInput,
): Promise<SendTrainingRequestResult> {
  if (input.senderId === input.receiverId) {
    throw new RequestServiceError("Tu ne peux pas t'envoyer une demande.");
  }

  if (!(SPORTS as readonly string[]).includes(input.sport)) {
    throw new RequestServiceError("Choisis un sport proposé par GymMate.");
  }

  const message = input.message.trim();

  if (message.length > REQUEST_MESSAGE_MAX) {
    throw new RequestServiceError("Le message ne peut pas dépasser 500 caractères.");
  }

  if (input.endsAt <= input.startsAt || input.startsAt <= new Date()) {
    throw new RequestServiceError(
      "Le créneau doit commencer dans le futur et se terminer après le début.",
    );
  }

  const existing = await readExistingRequest(requestRef);

  if (existing) {
    return { status: "already-exists", id: existing.id };
  }

  const [sender, receiver] = await Promise.all([
    getUserProfile(input.senderId),
    getUserProfile(input.receiverId),
  ]);

  if (!sender?.gymId) {
    throw new RequestServiceError("Choisis d'abord ta salle.");
  }

  if (!receiver || receiver.gymId !== sender.gymId) {
    throw new RequestServiceError("Cette personne n'est pas dans ta salle.");
  }

  try {
    await setDoc(requestRef, {
      senderId: input.senderId,
      receiverId: input.receiverId,
      members: [input.senderId, input.receiverId],
      gymId: sender.gymId,
      sport: input.sport,
      startsAt: Timestamp.fromDate(input.startsAt),
      endsAt: Timestamp.fromDate(input.endsAt),
      timeZone: REQUEST_TIME_ZONE,
      message,
      status: "pending",
      createdAt: serverTimestamp(),
      respondedAt: null,
    });
  } catch (error) {
    const again = await readExistingRequest(requestRef);

    if (again) {
      return { status: "already-exists", id: again.id };
    }

    const code = readErrorCode(error);

    if (code === "permission-denied") {
      throw new RequestServiceError(
        "L'envoi a été refusé. Publie les règles Firestore, puis réessaie.",
      );
    }

    if (code === "unavailable" || code === "deadline-exceeded") {
      throw new RequestServiceError("Connexion réseau impossible. Réessaie.");
    }

    console.error("Erreur d'envoi de la demande :", error);
    throw new RequestServiceError("La demande n'a pas pu être envoyée. Réessaie.");
  }

  return { status: "created", id: requestRef.id };
}

async function listByField(uid: string, field: "senderId" | "receiverId") {
  const snapshot = await getDocs(
    query(collection(db, "trainingRequests"), where(field, "==", uid)),
  );

  return snapshot.docs
    .map((request) => mapTrainingRequest(request.id, request.data()))
    .sort((left, right) => {
      const leftTime = left.createdAt?.toMillis() ?? 0;
      const rightTime = right.createdAt?.toMillis() ?? 0;
      return rightTime - leftTime;
    });
}

export function listSentRequests(uid: string) {
  return listByField(uid, "senderId");
}

export function listReceivedRequests(uid: string) {
  return listByField(uid, "receiverId");
}
