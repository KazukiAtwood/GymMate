import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ProfileTab() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon profil</Text>

      <Text style={styles.text}>Profil sportif local</Text>

      <Pressable style={styles.button} onPress={() => router.push("/profile")}>
        <Text style={styles.buttonText}>Modifier mon profil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
  },

  text: {
    marginTop: 10,
    color: "#6B7280",
  },

  button: {
    marginTop: 24,
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
