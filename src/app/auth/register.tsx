import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>

      <Text style={styles.text}>
        L'inscription Firebase sera ajoutée au J5.
      </Text>

      <Link href="/login" style={styles.link}>
        J'ai déjà un compte
      </Link>

      <Link href="/discover" style={styles.link}>
        Continuer vers GymMate
      </Link>

      <Link href="/" style={styles.back}>
        Retour à l'accueil
      </Link>
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
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 16,
  },

  text: {
    color: "#6B7280",
    marginBottom: 24,
  },

  link: {
    color: "#3C87F7",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 16,
  },

  back: {
    marginTop: 20,
    color: "#6B7280",
  },
});
