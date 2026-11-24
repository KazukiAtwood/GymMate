import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

type RelationCardProps = {
  partnerName: string;
  gymName: string;
  onOpenChat: () => void;
};

export function RelationCard({ partnerName, gymName, onOpenChat }: RelationCardProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },

  line: {
    marginTop: 6,
    color: colors.textMuted,
  },

  button: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
});
}
