import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

type MemberCardProps = {
  name: string;
  level: string;
  goal: string;
  availability?: string;
  onPress?: () => void;
};

export function MemberCard({
  name,
  level,
  goal,
  availability,
  onPress,
}: MemberCardProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View>
        <Text style={styles.name}>{name}</Text>

        <Text style={styles.info}>Niveau : {level}</Text>

        <Text style={styles.info}>Objectif : {goal}</Text>

        {availability ? <Text style={styles.info}>{availability}</Text> : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
  },

  pressed: {
    opacity: 0.7,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },

  info: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
  },
});
}
