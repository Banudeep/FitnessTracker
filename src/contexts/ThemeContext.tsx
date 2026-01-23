// ThemeProvider - Provides dynamic theme colors to entire app
import React, { createContext, useContext, useMemo } from "react";
import { useSettingsStore } from "../stores/settingsStore";

// Dark Theme Colors
export const darkTheme = {
  // Backgrounds
  bgPrimary: "#0D0D0F",
  bgSecondary: "#1A1A1D",
  bgTertiary: "#252528",
  bgElevated: "#2D2D30",
  bgCard: "#1E1E21",

  // Text
  textPrimary: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  textGold: "#D4A574",

  // Accents
  accentPrimary: "#E8956A",
  accentSecondary: "#22C55E",
  accentWarning: "#F59E0B",
  accentInfo: "#3B82F6",
  accentDanger: "#EF4444",

  // Gradient colors for header
  gradientStart: "#2D5A4A",
  gradientEnd: "#1A3D32",

  // Semantic
  prGold: "#FFD700",
  streakFire: "#D4A574",
  checkmark: "#9B8B6E",

  // Borders
  border: "#3F3F46",
  borderLight: "#52525B",

  // Tab bar
  tabInactive: "#6B6B6B",
  tabActive: "#E8956A",
  
  // Status bar style
  statusBarStyle: "light" as const,
} as const;

// Light Theme Colors
export const lightTheme = {
  // Backgrounds
  bgPrimary: "#F6F6F6", // Palette 1
  bgSecondary: "#FFFFFF",
  bgTertiary: "#C7FFD8", // Palette 2
  bgElevated: "#FFFFFF",
  bgCard: "#FFFFFF",

  // Text
  textPrimary: "#161D6F", // Palette 4
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  textGold: "#B45309",

  // Accents
  accentPrimary: "#161D6F", // Palette 4
  accentSecondary: "#98DED9", // Palette 3
  accentWarning: "#F59E0B",
  accentInfo: "#3B82F6",
  accentDanger: "#EF4444",

  // Gradient colors for header
  gradientStart: "#98DED9", // Palette 3
  gradientEnd: "#16626fff", // Palette 4

  // Semantic
  prGold: "#F59E0B",
  streakFire: "#F59E0B",
  checkmark: "#10B981",

  // Borders
  border: "#E5E7EB",
  borderLight: "#D1D5DB",

  // Tab bar
  tabInactive: "#9CA3AF",
  tabActive: "#161D6F", // Palette 4
  
  // Status bar style
  statusBarStyle: "dark" as const,
} as const;

// Type for theme colors (using string to allow both dark and light values)
export type ThemeColors = {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textGold: string;
  accentPrimary: string;
  accentSecondary: string;
  accentWarning: string;
  accentInfo: string;
  accentDanger: string;
  gradientStart: string;
  gradientEnd: string;
  prGold: string;
  streakFire: string;
  checkmark: string;
  border: string;
  borderLight: string;
  tabInactive: string;
  tabActive: string;
  statusBarStyle: "light" | "dark";
};

// Context
const ThemeContext = createContext<ThemeColors>(darkTheme);

// Provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((state) => state.theme);
  
  const colors = useMemo(() => {
    return theme === "dark" ? darkTheme : lightTheme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme colors
export function useColors(): ThemeColors {
  return useContext(ThemeContext);
}

// Hook to get theme name
export function useThemeName(): "dark" | "light" {
  return useSettingsStore((state) => state.theme);
}

// Helper to create themed styles - usage: const styles = useThemedStyles(createStyles);
export function useThemedStyles<T>(styleCreator: (colors: ThemeColors) => T): T {
  const colors = useColors();
  return useMemo(() => styleCreator(colors), [colors, styleCreator]);
}

export default ThemeProvider;
