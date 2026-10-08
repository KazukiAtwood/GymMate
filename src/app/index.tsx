import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  function handleDiscover() {
    router.push("/tabs/discover");
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>GymMate</Text>

        <Text style={styles.subtitle}>Trouve ton partenaire de sport.</Text>

        <Text style={styles.description}>
          Entraîne-toi avec des personnes qui partagent tes objectifs.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleDiscover}
        >
          <Text style={styles.buttonText}>Découvrir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  content: {
    width: "100%",
    maxWidth: 500,
    alignItems: "center",
  },

  title: {
    fontSize: 42,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },

  subtitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 12,
  },

  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },

  button: {
    backgroundColor: "#3C87F7",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
