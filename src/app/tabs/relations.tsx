import { StyleSheet, Text, View } from "react-native";

export default function RelationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relations</Text>

      <Text style={styles.text}>Tes partenaires apparaîtront ici.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
  },

  text: {
    marginTop: 12,
    color: "#6B7280",
  },
});
