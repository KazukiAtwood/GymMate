import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { getChat } from "@/services/chatService";
import { getUserProfile } from "@/services/profileService";
import type { ChatThread } from "@/types/relation";
import { readErrorCode } from "@/utils/errorCode";
import { isProfileReady } from "@/utils/profileValidation";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [chat, setChat] = useState<ChatThread | null>(null);
  const [partnerName, setPartnerName] = useState("Membre");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentChatId = Array.isArray(chatId) ? chatId[0] : chatId;

    if (!currentChatId || !user) {
      setLoading(false);
      setError("Cette conversation est introuvable.");
      return;
    }

    const uid = user.uid;
    let active = true;

    async function loadChat() {
      setLoading(true);
      setError(null);

      try {
        const nextChat = await getChat(currentChatId);

        if (!active) {
          return;
        }

        if (!nextChat || !nextChat.members.includes(uid)) {
          setChat(null);
          setError("Cette conversation n'est pas disponible.");
          return;
        }

        const partnerId = nextChat.members.find((memberId) => memberId !== uid) ?? "";
        setChat(nextChat);

        if (!partnerId) {
          return;
        }

        try {
          const partner = await getUserProfile(partnerId);

          if (active) {
            setPartnerName(partner?.displayName || "Membre");
          }
        } catch (profileError) {
          console.error("Erreur de lecture du partenaire :", profileError);
        }
      } catch (loadError) {
        console.error("Erreur de lecture de la conversation :", loadError);

        if (!active) {
          return;
        }

        const code = readErrorCode(loadError);
        setChat(null);
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

    void loadChat();

    return () => {
      active = false;
    };
  }, [chatId, user]);

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Retour</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#3C87F7" />
      ) : error ? (
        <Text style={styles.info}>{error}</Text>
      ) : chat ? (
        <View>
          <Text style={styles.title}>{partnerName}</Text>
          <Text style={styles.info}>Aucun message pour le moment.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24,
    paddingTop: 64,
  },

  back: {
    color: "#3C87F7",
    fontWeight: "700",
    marginBottom: 20,
  },

  loader: {
    marginTop: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },

  info: {
    marginTop: 16,
    color: "#6B7280",
    lineHeight: 22,
  },
});
