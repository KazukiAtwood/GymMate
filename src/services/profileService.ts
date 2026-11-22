import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

import type { SportProfile, SportProfileInput } from "@/types/profile";
import { readErrorCode } from "@/utils/errorCode";
import { cleanDisplayName, isSportLevel } from "@/utils/profileValidation";

import { db } from "./firebase";

function mapAvailability(value: unknown): SportProfile["availability"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const slot = item as Record<string, unknown>;
    const { day, start, end } = slot;

    if (
      typeof day !== "number" ||
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(day) ||
      !Number.isInteger(start) ||
      !Number.isInteger(end)
    ) {
      return [];
    }

    return [{ day, start, end }];
  });
}

function mapSports(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function mapTimestamp(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value as SportProfile["createdAt"];
  }

  return null;
}

export function mapProfile(
  id: string,
  data: Record<string, unknown>,
): SportProfile {
  const level = typeof data.level === "string" ? data.level : "";

  return {
    id,
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    city: typeof data.city === "string" ? data.city : "",
    level: isSportLevel(level) ? level : "",
    goal: typeof data.goal === "string" ? data.goal : "",
    sports: mapSports(data.sports),
    availability: mapAvailability(data.availability),
    bio: typeof data.bio === "string" ? data.bio : "",
    gymId: typeof data.gymId === "string" && data.gymId ? data.gymId : null,
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  };
}

export async function getUserProfile(uid: string) {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return mapProfile(snapshot.id, snapshot.data());
}

export async function createInitialProfile(uid: string, displayName: string) {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    return;
  }

  const name = cleanDisplayName(displayName);

  try {
    await setDoc(ref, {
      displayName: name,
      city: "",
      level: "",
      goal: "",
      sports: [],
      availability: [],
      bio: "",
      gymId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const again = await getDoc(ref);

    if (again.exists()) {
      return;
    }

    throw error;
  }
}

export async function listGymMembers(gymId: string, currentUid: string) {
  const membersQuery = query(
    collection(db, "users"),
    where("gymId", "==", gymId),
  );
  const snapshot = await getDocs(membersQuery);

  return snapshot.docs
    .map((member) => mapProfile(member.id, member.data()))
    .filter((member) => member.id !== currentUid);
}

export async function updateSportProfile(uid: string, input: SportProfileInput) {
  await updateDoc(doc(db, "users", uid), {
    displayName: cleanDisplayName(input.displayName),
    city: input.city.trim(),
    level: input.level,
    goal: input.goal.trim(),
    sports: input.sports,
    availability: input.availability,
    bio: input.bio.trim(),
    updatedAt: serverTimestamp(),
  });
}

export function profileWriteErrorMessage(error: unknown) {
  const code = readErrorCode(error);

  if (code === "permission-denied") {
    return "L'enregistrement a été refusé. Publiez les règles Firestore du projet, puis réessayez.";
  }

  if (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "auth/network-request-failed"
  ) {
    return "Connexion réseau impossible. Réessayez.";
  }

  return "Le profil n'a pas pu être enregistré. Réessayez.";
}
