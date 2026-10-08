import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function MemberDetailsScreen() {
  const { userId } = useLocalSearchParams<{
    userId: string;
  }>();

  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Text style={styles.title}>Profil du membre</Text>

      <Text style={styles.id}>Identifiant : {userId}</Text>

      <Text style={styles.info}>
        Les informations détaillées du membre seront connectées à Firestore au
        J6.
      </Text>

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Retour</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1F2937",
  },

  id: {
    marginTop: 12,
    fontWeight: "600",
    color: "#3C87F7",
  },

  info: {
    marginTop: 20,
    color: "#6B7280",
    lineHeight: 22,
  },

  button: {
    marginTop: 30,
    backgroundColor: "#3C87F7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
