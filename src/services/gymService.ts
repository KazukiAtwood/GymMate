import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { COURSE_GYM_COORDINATES } from "@/constants/gymCoordinates";
import type { Gym } from "@/types/gym";

import { db } from "./firebase";

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapGym(id: string, data: Record<string, unknown>): Gym {
  const latitude = asCoordinate(data.latitude);
  const longitude = asCoordinate(data.longitude);
  const stored = latitude !== null && longitude !== null ? { latitude, longitude } : null;
  const coordinates = stored ?? COURSE_GYM_COORDINATES[id] ?? null;

  return {
    id,
    name: asText(data.name),
    city: asText(data.city),
    address: asText(data.address),
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
  };
}

export async function listGyms() {
  const snapshot = await getDocs(collection(db, "gyms"));

  return snapshot.docs
    .map((gym) => mapGym(gym.id, gym.data()))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
}

export async function getGym(gymId: string) {
  const snapshot = await getDoc(doc(db, "gyms", gymId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapGym(snapshot.id, snapshot.data());
}

export async function chooseGym(uid: string, gymId: string) {
  await updateDoc(doc(db, "users", uid), {
    gymId,
    updatedAt: serverTimestamp(),
  });
}
