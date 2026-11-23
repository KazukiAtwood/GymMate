import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AvatarServiceError,
  discardStagedAvatar,
  getLocalAvatarUri,
  type PickedAvatar,
  rememberLocalAvatar,
  stageLocalAvatar,
} from "@/services/avatarService";

type PhotoStatus = "idle" | "waiting" | "refused" | "error";

const PICKER_OPTIONS = {
  mediaTypes: ["images"] as ImagePicker.MediaType[],
  quality: 0.7,
};

type ProfilePhotoEditorProps = {
  uid: string;
  displayName: string;
};

function firstAsset(result: ImagePicker.ImagePickerResult): PickedAvatar | null {
  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
  };
}

export function ProfilePhotoEditor({ uid, displayName }: ProfilePhotoEditorProps) {
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<PickedAvatar | null>(null);
  const [stagedUri, setStagedUri] = useState<string | null>(null);
  const [status, setStatus] = useState<PhotoStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadSavedPhoto = useCallback(async () => {
    try {
      setSavedUri(await getLocalAvatarUri(uid));
    } catch (error) {
      console.error("Erreur de lecture de la photo :", error);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        await loadSavedPhoto();

        try {
          const pending = await ImagePicker.getPendingResultAsync();

          if (!active || !pending || !("canceled" in pending)) {
            return;
          }

          const asset = firstAsset(pending);

          if (asset) {
            setDraft(asset);
            setStagedUri(null);
            setStatus("idle");
            setMessage(null);
          }
        } catch (error) {
          console.error("Erreur de reprise de la photo :", error);
        }
      })();

      return () => {
        active = false;
      };
    }, [loadSavedPhoto]),
  );

  async function pick(source: "camera" | "library") {
    if (status === "waiting") {
      return;
    }

    setStatus("waiting");
    setMessage(null);

    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          setStatus("refused");
          setMessage("Vous pouvez choisir une image dans la galerie.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          setStatus("refused");
          setMessage("L'accès aux photos est refusé.");
          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = firstAsset(result);

      if (!asset) {
        setStatus("idle");
        return;
      }

      setDraft(asset);
      setStagedUri(null);
      setStatus("idle");
    } catch (error) {
      console.error("Erreur de sélection de la photo :", error);
      setStatus("error");
      setMessage(
        source === "camera"
          ? "L'appareil photo est indisponible. Vous pouvez choisir une image dans la galerie."
          : "La galerie est indisponible. Réessaie.",
      );
    }
  }

  async function confirmPhoto() {
    if (!draft || status === "waiting") {
      return;
    }

    setStatus("waiting");
    setMessage(null);

    try {
      const nextUri = stagedUri ?? (await stageLocalAvatar(uid, draft));
      setStagedUri(nextUri);

      try {
        await rememberLocalAvatar(uid, nextUri);
      } catch (error) {
        console.error("Erreur de liaison de la photo :", error);
        setStatus("error");
        setMessage(
          error instanceof AvatarServiceError
            ? error.message
            : "La photo est sur le téléphone, mais elle n'a pas été reliée au profil. Réessaie.",
        );
        return;
      }

      setSavedUri(nextUri);
      setDraft(null);
      setStagedUri(null);
      setStatus("idle");
    } catch (error) {
      console.error("Erreur d'enregistrement de la photo :", error);
      setStatus("error");
      setMessage(
        error instanceof AvatarServiceError
          ? error.message
          : "La photo n'a pas pu être enregistrée. Réessaie.",
      );
    }
  }

  async function cancelDraft() {
    if (stagedUri) {
      await discardStagedAvatar(stagedUri, savedUri);
    }

    setDraft(null);
    setStagedUri(null);
    setStatus("idle");
    setMessage(null);
  }

  const previewUri = draft?.uri ?? savedUri;
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.wrap}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}
      <Text style={styles.hint}>
        {draft
          ? "Confirme pour garder cette photo sur le téléphone."
          : savedUri
            ? "Photo enregistrée sur ce téléphone."
            : "Aucune photo pour le moment."}
      </Text>
      {status === "waiting" ? <ActivityIndicator color="#3C87F7" /> : null}
      {message ? (
        <Text style={status === "error" ? styles.error : styles.refused}>{message}</Text>
      ) : null}
      {draft ? (
        <View style={styles.row}>
          <Pressable
            style={[styles.secondary, status === "waiting" && styles.disabled]}
            disabled={status === "waiting"}
            onPress={() => void cancelDraft()}
          >
            <Text style={styles.secondaryText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.primary, status === "waiting" && styles.disabled]}
            disabled={status === "waiting"}
            onPress={() => void confirmPhoto()}
          >
            <Text style={styles.primaryText}>Confirmer</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable
            style={[styles.secondary, status === "waiting" && styles.disabled]}
            disabled={status === "waiting"}
            onPress={() => void pick("camera")}
          >
            <Text style={styles.secondaryText}>Prendre une photo</Text>
          </Pressable>
          <Pressable
            style={[styles.secondary, status === "waiting" && styles.disabled]}
            disabled={status === "waiting"}
            onPress={() => void pick("library")}
          >
            <Text style={styles.secondaryText}>Galerie</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    gap: 12,
  },

  photo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E0ECFF",
  },

  placeholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E0ECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  initial: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1E40AF",
  },

  hint: {
    color: "#4B5563",
    lineHeight: 20,
  },

  refused: {
    color: "#1E40AF",
    backgroundColor: "#E0ECFF",
    borderRadius: 12,
    padding: 12,
    lineHeight: 20,
  },

  error: {
    color: "#991B1B",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    lineHeight: 20,
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  primary: {
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#3C87F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondary: {
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  secondaryText: {
    color: "#1F2937",
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.6,
  },
});
