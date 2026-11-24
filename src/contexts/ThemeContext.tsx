import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { Colors, type AppColors } from "@/constants/theme";

const THEME_KEY = "gymmate-theme";

export type ColorScheme = "light" | "dark";

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: AppColors;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredScheme() {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(THEME_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<ColorScheme>(readStoredScheme() ?? "light");

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (!active) {
        return;
      }

      if (stored === "dark" || stored === "light") {
        setScheme(stored);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(() => {
    setScheme((current) => {
      const next = current === "light" ? "dark" : "light";
      void AsyncStorage.setItem(THEME_KEY, next);

      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.setItem(THEME_KEY, next);
      }

      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors: Colors[scheme],
      toggle,
    }),
    [scheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext)?.colors ?? Colors.light;
}

export function useThemeControls() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("Le thème doit être utilisé dans ThemeProvider.");
  }

  return value;
}
