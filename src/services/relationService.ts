import { collection, getDocs, query, where } from "firebase/firestore";

import type { Relation } from "@/types/relation";

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
    return value as Relation["createdAt"];
  }

  return null;
}

function mapMembers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function mapRelation(id: string, data: Record<string, unknown>): Relation {
  return {
    id,
    members: mapMembers(data.members),
    gymId: asText(data.gymId),
    sourceRequestId: asText(data.sourceRequestId),
    createdAt: asTimestamp(data.createdAt),
  };
}

export async function listRelations(uid: string) {
  const snapshot = await getDocs(
    query(collection(db, "relations"), where("members", "array-contains", uid)),
  );

  return snapshot.docs
    .map((relation) => mapRelation(relation.id, relation.data()))
    .sort((left, right) => {
      const leftTime = left.createdAt?.toMillis() ?? 0;
      const rightTime = right.createdAt?.toMillis() ?? 0;
      return rightTime - leftTime;
    });
}
