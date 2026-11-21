import { getApp, getApps, initializeApp } from "firebase/app";
import {
    browserLocalPersistence,
    getAuth,
    getReactNativePersistence,
    inMemoryPersistence,
    initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { firebaseConfig } from "./firebaseConfig";

const missingKeys = ["apiKey", "authDomain", "projectId", "appId"].filter(
  (key) => !firebaseConfig[key],
);

if (missingKeys.length > 0) {
  throw new Error(
    `Configuration Firebase incomplète (${missingKeys.join(", ")}). Renseignez .env.local puis relancez Expo.`,
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function readErrorCode(error) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return error.code;
  }

  return undefined;
}

function createAuth(firebaseApp) {
  const nativePersistence =
    Platform.OS !== "web" && typeof getReactNativePersistence === "function"
      ? getReactNativePersistence(AsyncStorage)
      : null;

  const persistence =
    nativePersistence ??
    (typeof window === "undefined" ? inMemoryPersistence : browserLocalPersistence);

  try {
    return initializeAuth(firebaseApp, { persistence });
  } catch (error) {
    if (readErrorCode(error) === "auth/already-initialized") {
      return getAuth(firebaseApp);
    }

    throw error;
  }
}

/** @type {import("firebase/auth").Auth} */
const auth = createAuth(app);

const db = getFirestore(app);

export { auth, db };

