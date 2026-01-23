// FitTrack Theme System - Dynamic Dark/Light Mode Support
import { useSettingsStore } from "../stores/settingsStore";

// Dark Theme Colors (Original)
const darkTheme = {
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
  accentPrimary: "#E8956A", // Coral/Salmon - main CTA
  accentSecondary: "#22C55E", // Green - success, PRs, completion
  accentWarning: "#F59E0B", // Amber - warnings
  accentInfo: "#3B82F6", // Blue - links, info
  accentDanger: "#EF4444", // Red - delete, errors

  // Gradient colors for header
  gradientStart: "#2D5A4A",
  gradientEnd: "#1A3D32",

  // Semantic
  prGold: "#FFD700", // PR celebrations
  streakFire: "#D4A574", // Streak ring color (gold/beige)
  checkmark: "#9B8B6E", // Completed day checkmark

  // Borders
  border: "#3F3F46",
  borderLight: "#52525B",

  // Tab bar
  tabInactive: "#6B6B6B",
  tabActive: "#E8956A",
} as const;

// Light Theme Colors (New)
const lightTheme = {
  // Backgrounds
  bgPrimary: "#FFFFFF",
  bgSecondary: "#F9FAFB",
  bgTertiary: "#F3F4F6",
  bgElevated: "#E5E7EB",
  bgCard: "#FFFFFF",

  // Text
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  textGold: "#B45309",

  // Accents
  accentPrimary: "#2563EB", // Blue - main CTA
  accentSecondary: "#10B981", // Green - success, PRs, completion
  accentWarning: "#F59E0B", // Amber - warnings
  accentInfo: "#3B82F6", // Blue - links, info
  accentDanger: "#EF4444", // Red - delete, errors

  // Gradient colors for header
  gradientStart: "#3B82F6",
  gradientEnd: "#2563EB",

  // Semantic
  prGold: "#F59E0B", // PR celebrations
  streakFire: "#F59E0B", // Streak ring color (amber)
  checkmark: "#10B981", // Completed day checkmark

  // Borders
  border: "#E5E7EB",
  borderLight: "#D1D5DB",

  // Tab bar
  tabInactive: "#9CA3AF",
  tabActive: "#2563EB",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  "2xl": 40,
  "3xl": 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  heading4: {
    fontSize: 15,
    fontWeight: "600" as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  display: {
    fontSize: 48,
    fontWeight: "700" as const,
    lineHeight: 56,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// Get theme based on mode
export const getTheme = (isDark: boolean) => {
  return isDark ? darkTheme : lightTheme;
};

// Hook to use theme with automatic updates
export const useTheme = () => {
  const theme = useSettingsStore((state) => state.theme);
  const isDark = theme === "dark";
  return getTheme(isDark);
};

// Export default colors for backward compatibility (defaults to dark theme)
// This allows existing code to work without changes
export const colors = darkTheme;

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  getTheme,
  useTheme,
  darkTheme,
  lightTheme,
};
