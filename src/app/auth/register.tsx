import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { Link } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
} from "react-native";

import { AppTextField } from "@/components/AppTextField";

import { useSubmitLock } from "@/hooks/useSubmitLock";
import {
    AuthServiceError,
    ProfileSetupError,
    registerAccount,
} from "@/services/authService";
import {
    LIMITS,
    hasFieldErrors,
    validateRegister,
} from "@/utils/profileValidation";

export default function RegisterScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"displayName" | "email" | "password" | "confirmation", string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const { pending, run } = useSubmitLock();

  function handleSubmit() {
    const nextErrors = validateRegister({
      displayName,
      email,
      password,
      confirmation,
    });
    setFieldErrors(nextErrors);
    setFormError(null);

    if (hasFieldErrors(nextErrors)) {
      return;
    }

    void run(async () => {
      try {
        await registerAccount({ displayName, email, password });
      } catch (error) {
        if (error instanceof ProfileSetupError || error instanceof AuthServiceError) {
          setFormError(error.message);
          return;
        }

        console.error("Erreur d'inscription :", error);
        setFormError("L'inscription a échoué. Réessayez.");
      }
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.text}>
          Le mot de passe reste masqué et doit contenir au moins{" "}
          {LIMITS.passwordMin} caractères.
        </Text>

        <Text style={styles.label}>Nom affiché</Text>
        <AppTextField
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Ex : Lina"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={LIMITS.displayNameMax}
          editable={!pending}
          style={styles.input}
        />
        {fieldErrors.displayName ? (
          <Text style={styles.fieldError}>{fieldErrors.displayName}</Text>
        ) : null}

        <Text style={styles.label}>E-mail</Text>
        <AppTextField
          value={email}
          onChangeText={setEmail}
          placeholder="prenom@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          editable={!pending}
          style={styles.input}
        />
        {fieldErrors.email ? (
          <Text style={styles.fieldError}>{fieldErrors.email}</Text>
        ) : null}

        <Text style={styles.label}>Mot de passe</Text>
        <AppTextField
          value={password}
          onChangeText={setPassword}
          placeholder="6 caractères minimum"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!pending}
          style={styles.input}
        />
        <Text style={styles.helper}>Au moins 6 caractères.</Text>
        {fieldErrors.password ? (
          <Text style={styles.fieldError}>{fieldErrors.password}</Text>
        ) : null}

        <Text style={styles.label}>Confirmation</Text>
        <AppTextField
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Répète le mot de passe"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!pending}
          style={styles.input}
        />
        {fieldErrors.confirmation ? (
          <Text style={styles.fieldError}>{fieldErrors.confirmation}</Text>
        ) : null}

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pending && styles.buttonDisabled,
            pressed && !pending && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={pending}
        >
          <Text style={styles.buttonText}>
            {pending ? "Création..." : "Créer mon compte"}
          </Text>
        </Pressable>

        <Link href="/auth/login" style={styles.link}>
          J'ai déjà un compte
        </Link>

        <Link href="/" style={styles.back}>
          Retour à l'accueil
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 16,
    color: colors.text,
  },

  text: {
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 22,
  },

  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "700",
    color: colors.text,
  },

  helper: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },

  input: {
    backgroundColor: colors.backgroundElement,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },

  fieldError: {
    color: colors.danger,
    marginTop: 6,
  },

  formError: {
    marginTop: 16,
    color: colors.danger,
    backgroundColor: colors.dangerSurface,
    borderRadius: 12,
    padding: 12,
    lineHeight: 20,
  },

  button: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  link: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 20,
  },

  back: {
    marginTop: 16,
    color: colors.textMuted,
  },
});
}
