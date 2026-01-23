/**
 * Haptic Feedback Service
 * Provides consistent haptic feedback across the app
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Light impact - for button taps, selections
 */
export const lightImpact = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium impact - for completing sets, confirming actions
 */
export const mediumImpact = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Heavy impact - for major completions (workouts, achievements)
 */
export const heavyImpact = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Success notification - for PRs, achievements, successful operations
 */
export const successFeedback = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Warning notification - for destructive action confirmations
 */
export const warningFeedback = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Error notification - for errors, failed operations
 */
export const errorFeedback = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * Selection feedback - for picker changes, toggles
 */
export const selectionFeedback = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  await Haptics.selectionAsync();
};

// Convenience object for importing all haptics
export const haptics = {
  light: lightImpact,
  medium: mediumImpact,
  heavy: heavyImpact,
  success: successFeedback,
  warning: warningFeedback,
  error: errorFeedback,
  selection: selectionFeedback,
};
