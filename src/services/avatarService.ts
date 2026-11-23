import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export class AvatarServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarServiceError";
  }
}

export type PickedAvatar = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

type AvatarKind = "jpg" | "png";

function avatarKey(uid: string) {
  return `avatar:${uid}`;
}

function avatarKind(picked: PickedAvatar): AvatarKind | null {
  const mime = picked.mimeType?.toLowerCase() ?? "";
  const name = `${picked.fileName ?? ""} ${picked.uri}`.toLowerCase();

  if (mime === "image/jpeg" || mime === "image/jpg" || /\.jpe?g(\?|$)/.test(name)) {
    return "jpg";
  }

  if (mime === "image/png" || /\.png(\?|$)/.test(name)) {
    return "png";
  }

  if (!mime && !picked.fileName) {
    return "jpg";
  }

  return null;
}

async function rememberPath(uid: string, uri: string) {
  try {
    await AsyncStorage.setItem(avatarKey(uid), uri);
  } catch (error) {
    console.error("Erreur d'enregistrement du chemin de la photo :", error);
    throw new AvatarServiceError(
      "La photo est sur le téléphone, mais elle n'a pas été reliée au profil. Réessaie.",
    );
  }
}

export async function getLocalAvatarUri(uid: string) {
  const stored = await AsyncStorage.getItem(avatarKey(uid));

  if (!stored || Platform.OS === "web") {
    return stored;
  }

  const { File } = await import("expo-file-system");
  const file = new File(stored);

  return file.exists ? stored : null;
}

async function stageOnWeb(picked: PickedAvatar) {
  const response = await fetch(picked.uri);
  const blob = await response.blob();
  const kind = avatarKind({
    ...picked,
    mimeType: picked.mimeType || blob.type,
  });

  if (!kind) {
    throw new AvatarServiceError("Choisis une image JPEG ou PNG.");
  }

  if (blob.size > AVATAR_MAX_BYTES) {
    throw new AvatarServiceError("L'image dépasse 3 Mo.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  return dataUrl;
}

export async function stageLocalAvatar(uid: string, picked: PickedAvatar) {
  const kind = avatarKind(picked);

  if (!kind) {
    throw new AvatarServiceError("Choisis une image JPEG ou PNG.");
  }

  if (picked.fileSize && picked.fileSize > AVATAR_MAX_BYTES) {
    throw new AvatarServiceError("L'image dépasse 3 Mo.");
  }

  if (Platform.OS === "web") {
    return stageOnWeb(picked);
  }

  const { Directory, File, Paths } = await import("expo-file-system");
  const source = new File(picked.uri);

  if (source.exists && source.size > AVATAR_MAX_BYTES) {
    throw new AvatarServiceError("L'image dépasse 3 Mo.");
  }

  const directory = new Directory(Paths.document, "avatars", uid);
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `photo.${kind}`);

  if (destination.exists) {
    destination.delete();
  }

  await source.copy(destination);

  if (!destination.exists || destination.size <= 0) {
    throw new AvatarServiceError("La photo n'a pas pu être enregistrée.");
  }

  if (destination.size > AVATAR_MAX_BYTES) {
    destination.delete();
    throw new AvatarServiceError("L'image dépasse 3 Mo.");
  }

  return destination.uri;
}

export async function rememberLocalAvatar(uid: string, uri: string) {
  await rememberPath(uid, uri);

  if (Platform.OS === "web") {
    return;
  }

  try {
    const { Directory, File, Paths } = await import("expo-file-system");
    const directory = new Directory(Paths.document, "avatars", uid);
    const kept = new File(uri);

    for (const name of ["photo.jpg", "photo.png"]) {
      const sibling = new File(directory, name);

      if (sibling.uri !== kept.uri && sibling.exists) {
        sibling.delete();
      }
    }
  } catch (error) {
    console.error("Erreur de nettoyage de l'ancienne photo :", error);
  }
}

export async function discardStagedAvatar(uri: string, savedUri: string | null) {
  if (Platform.OS === "web" || uri === savedUri || uri.startsWith("data:")) {
    return;
  }

  try {
    const { File } = await import("expo-file-system");
    const file = new File(uri);

    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error("Erreur de suppression de la photo préparée :", error);
  }
}
