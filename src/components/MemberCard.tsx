import { Pressable, StyleSheet, Text, View } from "react-native";

type MemberCardProps = {
  name: string;
  level: string;
  goal: string;
  onPress?: () => void;
};

export function MemberCard({ name, level, goal, onPress }: MemberCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View>
        <Text style={styles.name}>{name}</Text>

        <Text style={styles.info}>Niveau : {level}</Text>

        <Text style={styles.info}>Objectif : {goal}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },

  pressed: {
    opacity: 0.7,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },

  info: {
    fontSize: 15,
    color: "#4B5563",
    marginTop: 4,
  },
});
