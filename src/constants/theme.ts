import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1C1917",
    textMuted: "#78716C",
    textSecondary: "#78716C",
    background: "#F6F1EA",
    backgroundElement: "#EDE4D6",
    backgroundSelected: "#FDE7D4",
    surface: "#FFFFFF",
    primary: "#C2410C",
    onPrimary: "#FFFFFF",
    border: "#E7DDD0",
    danger: "#9F1239",
    dangerSurface: "#FFE4E6",
    infoText: "#9A3412",
    infoSurface: "#FFEDD5",
    successText: "#166534",
    successSurface: "#DCFCE7",
    mutedSurface: "#F3EDE4",
    mutedText: "#57534E",
    placeholder: "#A8A29E",
    warningSurface: "#FEF3C7",
    warningText: "#92400E",
    tabBar: "#FFFFFF",
    tabInactive: "#78716C",
    shadow: "#1C1917",
  },
  dark: {
    text: "#FAF7F2",
    textMuted: "#D6D3D1",
    textSecondary: "#D6D3D1",
    background: "#14110F",
    backgroundElement: "#292524",
    backgroundSelected: "#3F2A1D",
    surface: "#1F1A17",
    primary: "#FF8A3D",
    onPrimary: "#1C120C",
    border: "#3A322C",
    danger: "#FECDD3",
    dangerSurface: "#3F1D24",
    infoText: "#FDBA74",
    infoSurface: "#3F2A1D",
    successText: "#BBF7D0",
    successSurface: "#14532D",
    mutedSurface: "#292524",
    mutedText: "#E7E5E4",
    placeholder: "#A8A29E",
    warningSurface: "#78350F",
    warningText: "#FDE68A",
    tabBar: "#1A1614",
    tabInactive: "#A8A29E",
    shadow: "#000000",
  },
} as const;

export type AppColors = {
  [Key in keyof typeof Colors.light]: string;
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
