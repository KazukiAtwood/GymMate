import { readErrorCode } from "@/utils/errorCode";

type AuthForm = "register" | "login";

const LOGIN_FAILURE = "Connexion impossible avec ces identifiants.";

export function mapAuthError(error: unknown, form: AuthForm) {
  const code = readErrorCode(error);

  if (code === "auth/network-request-failed") {
    return "Connexion réseau impossible. Réessayez.";
  }

  if (code === "auth/too-many-requests") {
    return "Trop de tentatives. Réessayez plus tard.";
  }

  if (code === "auth/operation-not-allowed") {
    return form === "register"
      ? "L'inscription par e-mail n'est pas activée sur le projet Firebase."
      : "La connexion par e-mail n'est pas activée sur le projet Firebase.";
  }

  if (form === "register") {
    if (code === "auth/email-already-in-use") {
      return "Cette adresse est déjà utilisée. Connectez-vous ou choisissez une autre adresse.";
    }

    if (code === "auth/invalid-email") {
      return "L'adresse e-mail n'est pas valide.";
    }

    if (code === "auth/weak-password") {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }

    return "L'inscription a échoué. Réessayez.";
  }

  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email" ||
    code === "auth/user-disabled"
  ) {
    return LOGIN_FAILURE;
  }

  return LOGIN_FAILURE;
}
