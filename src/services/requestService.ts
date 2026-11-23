import {
    Timestamp,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
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
import { canonicalPair } from "@/utils/pairId";
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

export type RequestDecisionResult =
  | { status: "accepted"; requestId: string; pairId: string; already: boolean }
  | { status: "rejected"; requestId: string; already: boolean };

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
  try {
    const snapshot = await getDoc(requestRef);

    if (!snapshot.exists()) {
      return null;
    }

    return mapTrainingRequest(snapshot.id, snapshot.data());
  } catch (error) {
    if (readErrorCode(error) === "permission-denied") {
      return null;
    }

    throw error;
  }
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

function decisionFailure(error: unknown) {
  const code = readErrorCode(error);

  if (code === "permission-denied") {
    return "La réponse a été refusée. Le créneau est peut-être passé, ou les règles Firestore ne sont pas publiées.";
  }

  if (code === "unavailable" || code === "deadline-exceeded" || code === "aborted") {
    return "Connexion réseau impossible. Réessaie.";
  }

  console.error("Erreur de réponse à la demande :", error);
  return "La réponse n'a pas pu être enregistrée. Réessaie.";
}

export async function rejectTrainingRequest(
  requestId: string,
  uid: string,
): Promise<RequestDecisionResult> {
  const requestRef = doc(db, "trainingRequests", requestId);
  const current = await readExistingRequest(requestRef);

  if (!current) {
    throw new RequestServiceError("Cette demande est introuvable.");
  }

  if (current.receiverId !== uid) {
    throw new RequestServiceError("Seul le destinataire peut répondre à cette demande.");
  }

  if (current.status === "rejected") {
    return { status: "rejected", requestId, already: true };
  }

  if (current.status === "accepted") {
    throw new RequestServiceError("Cette demande a déjà été acceptée.");
  }

  try {
    await updateDoc(requestRef, {
      status: "rejected",
      respondedAt: serverTimestamp(),
    });
  } catch (error) {
    const again = await readExistingRequest(requestRef);

    if (again?.status === "rejected") {
      return { status: "rejected", requestId, already: true };
    }

    if (again?.status === "accepted") {
      throw new RequestServiceError("Cette demande a déjà été acceptée.");
    }

    throw new RequestServiceError(decisionFailure(error));
  }

  return { status: "rejected", requestId, already: false };
}

export async function acceptTrainingRequest(
  requestId: string,
  uid: string,
): Promise<RequestDecisionResult> {
  const requestRef = doc(db, "trainingRequests", requestId);

  try {
    return await runTransaction(db, async (transaction) => {
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists()) {
        throw new RequestServiceError("Cette demande est introuvable.");
      }

      const request = mapTrainingRequest(requestSnap.id, requestSnap.data());

      if (request.receiverId !== uid) {
        throw new RequestServiceError("Seul le destinataire peut répondre à cette demande.");
      }

      const pair = canonicalPair(request.senderId, request.receiverId);
      const relationRef = doc(db, "relations", pair.pairId);
      const chatRef = doc(db, "chats", pair.pairId);
      const sessionRef = doc(db, "trainingSessions", request.id);
      const relationSnap = await transaction.get(relationRef);
      const chatSnap = await transaction.get(chatRef);
      const sessionSnap = await transaction.get(sessionRef);

      if (request.status === "accepted") {
        return {
          status: "accepted" as const,
          requestId: request.id,
          pairId: pair.pairId,
          already: true,
        };
      }

      if (request.status === "rejected") {
        throw new RequestServiceError("Cette demande a déjà été refusée.");
      }

      if (sessionSnap.exists()) {
        throw new RequestServiceError(
          "Cette demande a déjà une séance. Actualise la liste, puis réessaie.",
        );
      }

      const rawMembers = requestSnap.data().members;

      if (
        !request.startsAt ||
        !request.endsAt ||
        request.timeZone !== REQUEST_TIME_ZONE ||
        !Array.isArray(rawMembers) ||
        rawMembers.length !== 2
      ) {
        throw new RequestServiceError("Cette demande est incomplète.");
      }

      if (request.startsAt.toMillis() <= Date.now()) {
        throw new RequestServiceError(
          "Ce créneau est déjà passé. Refuse cette demande et propose un autre horaire.",
        );
      }

      const chatMembers = relationSnap.exists()
        ? mapMembers(relationSnap.data().members)
        : pair.members;

      transaction.update(requestRef, {
        status: "accepted",
        respondedAt: serverTimestamp(),
      });

      if (!relationSnap.exists()) {
        transaction.set(relationRef, {
          members: pair.members,
          gymId: request.gymId,
          sourceRequestId: request.id,
          createdAt: serverTimestamp(),
        });
      }

      if (!chatSnap.exists()) {
        transaction.set(chatRef, {
          relationId: pair.pairId,
          members: chatMembers,
          createdAt: serverTimestamp(),
        });
      }

      transaction.set(sessionRef, {
        requestId: request.id,
        relationId: pair.pairId,
        members: rawMembers,
        gymId: request.gymId,
        sport: request.sport,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
        timeZone: request.timeZone,
        status: "planned",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        status: "accepted" as const,
        requestId: request.id,
        pairId: pair.pairId,
        already: false,
      };
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      throw error;
    }

    throw new RequestServiceError(decisionFailure(error));
  }
}
