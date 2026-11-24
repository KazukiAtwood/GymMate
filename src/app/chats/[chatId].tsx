import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { DocumentReference } from "firebase/firestore";

import { MessageBubble } from "@/components/MessageBubble";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import {
  CHAT_TEXT_MAX,
  ChatServiceError,
  chatTextError,
  createChatMessageRef,
  getChat,
  sendChatMessage,
  subscribeToChatMessages,
} from "@/services/chatService";
import { getRelation } from "@/services/relationService";
import { getUserProfile } from "@/services/profileService";
import type { ChatMessage } from "@/types/chatMessage";
import type { ChatThread } from "@/types/relation";
import { readErrorCode } from "@/utils/errorCode";
import { isProfileReady } from "@/utils/profileValidation";

export default function ChatScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { pending: sending, run: runSend } = useSubmitLock();
  const messageRef = useRef<DocumentReference | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [chat, setChat] = useState<ChatThread | null>(null);
  const [partnerName, setPartnerName] = useState("Membre");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesReady, setMessagesReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const currentChatId = Array.isArray(chatId) ? chatId[0] : chatId;

    setMessages([]);
    setMessagesReady(false);
    setChat(null);
    setPartnerName("Membre");
    setDraft("");
    setSendError(null);
    messageRef.current = null;

    if (!currentChatId || !user) {
      setLoading(false);
      setError("Cette conversation est introuvable.");
      return;
    }

    const uid = user.uid;
    let active = true;
    let unsubscribe = () => {};

    async function openChat() {
      setLoading(true);
      setError(null);

      try {
        const nextChat = await getChat(currentChatId);

        if (!active) {
          return;
        }

        const relation = nextChat ? await getRelation(nextChat.relationId) : null;

        if (!active) {
          return;
        }

        const allowed = Boolean(
          nextChat &&
            nextChat.relationId === nextChat.id &&
            nextChat.members.includes(uid) &&
            relation &&
            relation.members.includes(uid),
        );

        if (!nextChat || !allowed) {
          setError("Cette conversation n'est pas disponible.");
          return;
        }

        setChat(nextChat);
        messageRef.current = createChatMessageRef(nextChat.id);

        const partnerId = nextChat.members.find((memberId) => memberId !== uid) ?? "";

        if (partnerId) {
          try {
            const partner = await getUserProfile(partnerId);

            if (active) {
              setPartnerName(partner?.displayName || "Membre");
            }
          } catch (profileError) {
            console.error("Erreur de lecture du partenaire :", profileError);
          }
        }

        if (!active) {
          return;
        }

        unsubscribe = subscribeToChatMessages(
          nextChat.id,
          (nextMessages) => {
            if (!active) {
              return;
            }

            setMessages(nextMessages);
            setMessagesReady(true);
          },
          () => {
            if (!active) {
              return;
            }

            setMessagesReady(true);
            setError("Messages indisponibles. Réessaie.");
          },
        );
      } catch (loadError) {
        console.error("Erreur de lecture de la conversation :", loadError);

        if (!active) {
          return;
        }

        const code = readErrorCode(loadError);
        setError(
          code === "permission-denied"
            ? "Cette conversation est réservée aux deux partenaires."
            : "La conversation est indisponible. Réessaie.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void openChat();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function leaveChat() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/tabs/relations");
  }

  function handleSend() {
    const currentRef = messageRef.current;
    const currentChat = chat;

    if (!user || !currentRef || !currentChat || sending) {
      return;
    }

    const validationError = chatTextError(draft);

    if (validationError) {
      setSendError(validationError);
      return;
    }

    setSendError(null);

    void runSend(async () => {
      try {
        await sendChatMessage(currentRef, user.uid, draft);
        setDraft("");
        messageRef.current = createChatMessageRef(currentChat.id);
      } catch (sendFailure) {
        console.error("Erreur d'envoi du message :", sendFailure);
        setSendError(
          sendFailure instanceof ChatServiceError
            ? sendFailure.message
            : "L'envoi a échoué. Ton message est conservé.",
        );
      }
    });
  }

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={leaveChat}>
        <Text style={styles.back}>Retour</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : error && !chat ? (
        <Text style={styles.info}>{error}</Text>
      ) : chat ? (
        <>
          <Text style={styles.title}>{partnerName}</Text>
          {error ? <Text style={styles.sendError}>{error}</Text> : null}
          {messagesReady && messages.length === 0 && !error ? (
            <Text style={styles.info}>Aucun message pour le moment.</Text>
          ) : null}
          <FlatList
            ref={listRef}
            style={styles.list}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <MessageBubble message={item} mine={item.senderId === user?.uid} />
            )}
            ListEmptyComponent={
              messagesReady ? null : <ActivityIndicator color={colors.primary} style={styles.loader} />
            }
          />
          {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
          <Text style={styles.counter}>
            {draft.trim().length}/{CHAT_TEXT_MAX}
          </Text>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Écrire un message"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
              maxLength={CHAT_TEXT_MAX}
            />
            <Pressable
              style={[styles.send, sending && styles.disabled]}
              disabled={sending}
              onPress={handleSend}
            >
              <Text style={styles.sendText}>{sending ? "..." : "Envoyer"}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 64,
  },

  back: {
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 20,
  },

  loader: {
    marginTop: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },

  info: {
    marginTop: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },

  list: {
    flex: 1,
    marginTop: 12,
  },

  sendError: {
    marginTop: 12,
    color: colors.danger,
    backgroundColor: colors.dangerSurface,
    borderRadius: 12,
    padding: 12,
    lineHeight: 20,
  },

  counter: {
    marginTop: 8,
    color: colors.textMuted,
    textAlign: "right",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },

  send: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  sendText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.6,
  },
});
}
