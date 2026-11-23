import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    dayLabel,
    formatMinutes,
    levelLabel,
} from "@/constants/profileOptions";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/services/profileService";
import type { SportProfile } from "@/types/profile";
import { readErrorCode } from "@/utils/errorCode";
import { isProfileReady } from "@/utils/profileValidation";

export default function MemberDetailsScreen() {
  const { userId } = useLocalSearchParams<{
    userId: string;
  }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [member, setMember] = useState<SportProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const memberId = Array.isArray(userId) ? userId[0] : userId;

    if (!memberId) {
      setLoading(false);
      setError("Ce membre est introuvable.");
      return;
    }

    let active = true;

    async function loadMember() {
      setLoading(true);
      setError(null);

      try {
        const nextMember = await getUserProfile(memberId);

        if (!active) {
          return;
        }

        if (!nextMember) {
          setError("Ce membre est introuvable.");
          setMember(null);
          return;
        }

        setMember(nextMember);
      } catch (loadError) {
        console.error("Erreur de lecture du membre :", loadError);

        if (!active) {
          return;
        }

        const code = readErrorCode(loadError);
        setMember(null);
        setError(
          code === "permission-denied"
            ? "Ce profil n'est pas accessible. Seuls les membres de ta salle peuvent le consulter."
            : "Le profil est indisponible. Réessayez.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMember();

    return () => {
      active = false;
    };
  }, [userId]);

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Retour</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#3C87F7" />
      ) : error ? (
        <Text style={styles.info}>{error}</Text>
      ) : member ? (
        <View>
          <Text style={styles.title}>{member.displayName}</Text>
          <Text style={styles.line}>Ville : {member.city}</Text>
          <Text style={styles.line}>Niveau : {levelLabel(member.level)}</Text>
          <Text style={styles.line}>Objectif : {member.goal}</Text>
          <Text style={styles.line}>
            Sports : {member.sports.length ? member.sports.join(", ") : "Aucun"}
          </Text>
          {member.bio ? <Text style={styles.bio}>{member.bio}</Text> : null}

          <Text style={styles.section}>Disponibilités</Text>
          {member.availability.map((slot, index) => (
            <Text key={`${slot.day}-${slot.start}-${index}`} style={styles.slot}>
              {dayLabel(slot.day)} : {formatMinutes(slot.start)} -{" "}
              {formatMinutes(slot.end)}
            </Text>
          ))}

          {user && member.id !== user.uid ? (
            <Pressable
              style={styles.button}
              onPress={() =>
                router.push({
                  pathname: "/requests/new",
                  params: { receiverId: member.id },
                })
              }
            >
              <Text style={styles.buttonText}>Proposer un entraînement</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
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

  line: {
    marginTop: 10,
    color: "#1F2937",
    fontSize: 16,
  },

  bio: {
    marginTop: 16,
    color: "#4B5563",
    lineHeight: 22,
  },

  section: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  slot: {
    color: "#1E40AF",
    backgroundColor: "#E0ECFF",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    fontWeight: "600",
  },

  info: {
    marginTop: 20,
    color: "#6B7280",
    lineHeight: 22,
  },

  button: {
    marginTop: 28,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
