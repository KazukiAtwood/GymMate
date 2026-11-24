import { TextInput, type TextInputProps } from "react-native";

import { useThemeControls } from "@/contexts/ThemeContext";

export function AppTextField({ style, placeholderTextColor, ...props }: TextInputProps) {
  const { colors, scheme } = useThemeControls();

  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholderTextColor ?? colors.placeholder}
      cursorColor={colors.primary}
      selectionColor={colors.primary}
      keyboardAppearance={scheme === "dark" ? "dark" : "light"}
      style={[style, { color: colors.text }]}
    />
  );
}
