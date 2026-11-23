import { Pressable, StyleSheet, Text, View } from "react-native";

type RelationCardProps = {
  partnerName: string;
  gymName: string;
  onOpenChat: () => void;
};

export function RelationCard({ partnerName, gymName, onOpenChat }: RelationCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{partnerName}</Text>
      <Text style={styles.line}>{gymName}</Text>
      <Pressable style={styles.button} onPress={onOpenChat}>
        <Text style={styles.buttonText}>Ouvrir le chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  line: {
    marginTop: 6,
    color: "#4B5563",
  },

  button: {
    marginTop: 16,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
