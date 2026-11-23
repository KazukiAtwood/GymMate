import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SPORTS } from "@/constants/profileOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { getUserProfile } from "@/services/profileService";
import {
    RequestServiceError,
    createTrainingRequestRef,
    sendTrainingRequest,
} from "@/services/requestService";
import type { SportProfile } from "@/types/profile";
import { hasFieldErrors, isProfileReady } from "@/utils/profileValidation";
import {
    REQUEST_MESSAGE_MAX,
    buildRequestSlot,
    validateTrainingRequest,
    type RequestFieldErrors,
} from "@/utils/requestValidation";

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewRequestScreen() {
  const router = useRouter();
  const { receiverId: receiverIdParam } = useLocalSearchParams<{
    receiverId?: string;
  }>();
  const receiverId = readParam(receiverIdParam);
  const { user, profile } = useAuth();
  const { pending, run } = useSubmitLock();
  const requestRef = useRef(createTrainingRequestRef());
  const [receiver, setReceiver] = useState<SportProfile | null>(null);
  const [loadingReceiver, setLoadingReceiver] = useState(true);
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [sport, setSport] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<RequestFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiverId) {
      setLoadingReceiver(false);
      setReceiverError("Le destinataire est introuvable.");
      return;
    }

    let active = true;

    async function loadReceiver() {
      setLoadingReceiver(true);
      setReceiverError(null);

      try {
        const nextReceiver = await getUserProfile(receiverId as string);

        if (!active) {
          return;
        }

        if (!nextReceiver) {
          setReceiverError("Le destinataire est introuvable.");
          setReceiver(null);
          return;
        }

        setReceiver(nextReceiver);
      } catch (error) {
        console.error("Erreur de lecture du destinataire :", error);

        if (active) {
          setReceiverError("Le destinataire est indisponible. Réessaie.");
        }
      } finally {
        if (active) {
          setLoadingReceiver(false);
        }
      }
    }

    void loadReceiver();

    return () => {
      active = false;
    };
  }, [receiverId]);

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  function handleSend() {
    const nextErrors = validateTrainingRequest({ sport, date, start, end, message });
    setErrors(nextErrors);
    setFormError(null);

    if (!user || !receiverId || hasFieldErrors(nextErrors)) {
      return;
    }

    const slot = buildRequestSlot(date, start, end);

    if (!slot) {
      return;
    }

    void run(async () => {
      try {
        const result = await sendTrainingRequest(requestRef.current, {
          senderId: user.uid,
          receiverId,
          sport,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          message,
        });

        router.replace({
          pathname: "/tabs/requests",
          params: {
            tab: "sent",
            notice: result.status === "already-exists" ? "already" : "",
          },
        });
      } catch (error) {
        if (error instanceof RequestServiceError) {
          setFormError(error.message);
          return;
        }

        console.error("Erreur d'envoi de la demande :", error);
        setFormError("La demande n'a pas pu être envoyée. Réessaie.");
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
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Proposer un entraînement</Text>

        {loadingReceiver ? (
          <ActivityIndicator style={styles.loader} size="large" color="#3C87F7" />
        ) : receiverError ? (
          <Text style={styles.formError}>{receiverError}</Text>
        ) : (
          <>
            <Text style={styles.subtitle}>
              À {receiver?.displayName}. Le créneau est enregistré pour l'Europe/Paris.
            </Text>

            <Text style={styles.label}>Sport</Text>
            <View style={styles.options}>
              {SPORTS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSport(item)}
                  style={[styles.option, sport === item && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, sport === item && styles.optionTextSelected]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.sport ? <Text style={styles.fieldError}>{errors.sport}</Text> : null}

            <Text style={styles.label}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="JJ/MM/AAAA"
              autoCapitalize="none"
              editable={!pending}
              style={styles.input}
            />
            {errors.date ? <Text style={styles.fieldError}>{errors.date}</Text> : null}

            <Text style={styles.label}>Heure de début</Text>
            <TextInput
              value={start}
              onChangeText={setStart}
              placeholder="18:00"
              autoCapitalize="none"
              editable={!pending}
              style={styles.input}
            />
            {errors.start ? <Text style={styles.fieldError}>{errors.start}</Text> : null}

            <Text style={styles.label}>Heure de fin</Text>
            <TextInput
              value={end}
              onChangeText={setEnd}
              placeholder="19:00"
              autoCapitalize="none"
              editable={!pending}
              style={styles.input}
            />
            {errors.end ? <Text style={styles.fieldError}>{errors.end}</Text> : null}

            <Text style={styles.label}>Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Un mot pour proposer la séance"
              multiline
              maxLength={REQUEST_MESSAGE_MAX}
              editable={!pending}
              style={[styles.input, styles.messageInput]}
            />
            <Text style={styles.counter}>
              {message.trim().length}/{REQUEST_MESSAGE_MAX}
            </Text>
            {errors.message ? <Text style={styles.fieldError}>{errors.message}</Text> : null}

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Pressable
              style={[styles.button, pending && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={pending || !receiver}
            >
              <Text style={styles.buttonText}>
                {pending ? "Envoi..." : "Envoyer la demande"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  back: {
    color: "#3C87F7",
    fontWeight: "700",
    marginBottom: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 8,
    color: "#6B7280",
    lineHeight: 22,
  },

  loader: {
    marginTop: 40,
  },

  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  messageInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  counter: {
    textAlign: "right",
    marginTop: 5,
    color: "#6B7280",
    fontSize: 12,
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  option: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },

  optionSelected: {
    backgroundColor: "#3C87F7",
    borderColor: "#3C87F7",
  },

  optionText: {
    color: "#374151",
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  fieldError: {
    color: "#B91C1C",
    marginTop: 6,
  },

  formError: {
    marginTop: 16,
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    lineHeight: 20,
  },

  button: {
    marginTop: 24,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
