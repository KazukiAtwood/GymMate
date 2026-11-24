import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";

import { useThemeControls } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { scheme, colors, toggle } = useThemeControls();
  const dark = scheme === "dark";

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={dark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      <Ionicons name={dark ? "sunny" : "moon"} size={18} color={colors.primary} />
      <Text style={[styles.label, { color: colors.text }]}>{dark ? "Clair" : "Sombre"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  pressed: {
    opacity: 0.7,
  },

  label: {
    fontWeight: "700",
  },
});
