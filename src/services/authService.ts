import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";

import { cleanDisplayName } from "@/utils/profileValidation";
import { mapAuthError } from "@/utils/authErrors";

import { auth } from "./firebase";
import { createInitialProfile } from "./profileService";
import { clearAccountReminders } from "./reminderService";

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export class ProfileSetupError extends Error {
  constructor() {
    super(
      "Le compte est créé, mais le profil n'a pas pu être enregistré. Vous pouvez reprendre cette étape sans vous réinscrire.",
    );
    this.name = "ProfileSetupError";
  }
}

type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
};

export async function registerAccount(input: RegisterInput) {
  const email = input.email.trim();
  const displayName = cleanDisplayName(input.displayName);
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(auth, email, input.password);
  } catch (error) {
    throw new AuthServiceError(mapAuthError(error, "register"));
  }

  try {
    await updateProfile(credential.user, { displayName });
  } catch (error) {
    console.error("Impossible d'enregistrer le nom sur le compte :", error);
  }

  try {
    await createInitialProfile(credential.user.uid, displayName);
  } catch (error) {
    console.error("Échec de création du document profil :", error);
    throw new ProfileSetupError();
  }
}

export async function loginAccount(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new AuthServiceError(mapAuthError(error, "login"));
  }
}

export async function logoutAccount() {
  const uid = auth.currentUser?.uid;

  if (uid) {
    try {
      await clearAccountReminders(uid);
    } catch (error) {
      console.error("Erreur de nettoyage des rappels :", error);
    }
  }

  await signOut(auth);
}
