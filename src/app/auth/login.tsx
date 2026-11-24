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
    TextInput,
} from "react-native";

import { useSubmitLock } from "@/hooks/useSubmitLock";
import { AuthServiceError, loginAccount } from "@/services/authService";
import { hasFieldErrors, validateLogin } from "@/utils/profileValidation";

export default function LoginScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"email" | "password", string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const { pending, run } = useSubmitLock();

  function handleSubmit() {
    const nextErrors = validateLogin({ email, password });
    setFieldErrors(nextErrors);
    setFormError(null);

    if (hasFieldErrors(nextErrors)) {
      return;
    }

    void run(async () => {
      try {
        await loginAccount(email, password);
      } catch (error) {
        if (error instanceof AuthServiceError) {
          setFormError(error.message);
          return;
        }

        console.error("Erreur de connexion :", error);
        setFormError("Connexion impossible avec ces identifiants.");
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
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.text}>
          Reprends ta session GymMate avec ton e-mail et ton mot de passe.
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
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
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Ton mot de passe"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          editable={!pending}
          style={styles.input}
        />
        {fieldErrors.password ? (
          <Text style={styles.fieldError}>{fieldErrors.password}</Text>
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
            {pending ? "Connexion..." : "Se connecter"}
          </Text>
        </Pressable>

        <Link href="/auth/register" style={styles.link}>
          Créer un compte
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
    justifyContent: "center",
    padding: 24,
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

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
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
