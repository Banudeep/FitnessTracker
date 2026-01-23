/**
 * Common Styles Module
 * Shared style patterns used across the app
 */
import { StyleSheet, ViewStyle, TextStyle, Dimensions } from "react-native";
import { colors, spacing, borderRadius, typography, shadows } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Screen container styles
 */
export const screenStyles = StyleSheet.create({
  // Full screen container with dark background
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },

  // Content container with horizontal padding
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Centered content (for loading, empty states)
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
  },

  // Safe area padded container
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: spacing.lg,
  },

  // Scrollable content area
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});

/**
 * Card styles
 */
export const cardStyles = StyleSheet.create({
  // Standard card
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  // Elevated card
  cardElevated: {
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },

  // Bordered card
  cardBordered: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Compact card (less padding)
  cardCompact: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
});

/**
 * Text styles
 */
export const textStyles = StyleSheet.create({
  // Headings
  h1: {
    ...typography.heading1,
    color: colors.textPrimary,
  } as TextStyle,

  h2: {
    ...typography.heading2,
    color: colors.textPrimary,
  } as TextStyle,

  h3: {
    ...typography.heading3,
    color: colors.textPrimary,
  } as TextStyle,

  h4: {
    ...typography.heading4,
    color: colors.textPrimary,
  } as TextStyle,

  // Body text
  body: {
    ...typography.body,
    color: colors.textPrimary,
  } as TextStyle,

  bodySmall: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  } as TextStyle,

  // Labels & captions
  label: {
    ...typography.label,
    color: colors.textSecondary,
  } as TextStyle,

  caption: {
    ...typography.caption,
    color: colors.textMuted,
  } as TextStyle,

  // Special text
  accent: {
    color: colors.accentPrimary,
  },

  success: {
    color: colors.accentSecondary,
  },

  warning: {
    color: colors.accentWarning,
  },

  danger: {
    color: colors.accentDanger,
  },
});

/**
 * Button styles
 */
export const buttonStyles = StyleSheet.create({
  // Primary button
  primary: {
    backgroundColor: colors.accentPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "600" as const,
    fontSize: 16,
  },

  // Secondary button
  secondary: {
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  secondaryText: {
    color: colors.textPrimary,
    fontWeight: "600" as const,
    fontSize: 16,
  },

  // Outlined button
  outlined: {
    backgroundColor: "transparent",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  outlinedText: {
    color: colors.textPrimary,
    fontWeight: "600" as const,
    fontSize: 16,
  },

  // Ghost/text button
  ghost: {
    backgroundColor: "transparent",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  ghostText: {
    color: colors.accentPrimary,
    fontWeight: "500" as const,
    fontSize: 14,
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
});

/**
 * Input styles
 */
export const inputStyles = StyleSheet.create({
  // Standard input container
  container: {
    marginBottom: spacing.lg,
  },

  // Input label
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  } as TextStyle,

  // Text input
  input: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Focused state
  inputFocused: {
    borderColor: colors.accentPrimary,
  },

  // Error state
  inputError: {
    borderColor: colors.accentDanger,
  },

  // Error message
  errorText: {
    ...typography.caption,
    color: colors.accentDanger,
    marginTop: spacing.xs,
  } as TextStyle,

  // Helper text
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  } as TextStyle,
});

/**
 * Layout utilities
 */
export const layoutStyles = StyleSheet.create({
  // Flex containers
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  column: {
    flexDirection: "column",
  },

  columnCenter: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  // Gap utilities (for use with style arrays)
  gapXs: {
    gap: spacing.xs,
  },

  gapSm: {
    gap: spacing.sm,
  },

  gapMd: {
    gap: spacing.md,
  },

  gapLg: {
    gap: spacing.lg,
  },

  // Margin utilities
  mt_sm: { marginTop: spacing.sm },
  mt_md: { marginTop: spacing.md },
  mt_lg: { marginTop: spacing.lg },
  mt_xl: { marginTop: spacing.xl },

  mb_sm: { marginBottom: spacing.sm },
  mb_md: { marginBottom: spacing.md },
  mb_lg: { marginBottom: spacing.lg },
  mb_xl: { marginBottom: spacing.xl },

  // Full width
  fullWidth: {
    width: "100%",
  },

  // Screen width
  screenWidth: {
    width: SCREEN_WIDTH,
  },
});

/**
 * Separator/divider styles
 */
export const dividerStyles = StyleSheet.create({
  horizontal: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  vertical: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});

/**
 * Modal styles
 */
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: SCREEN_WIDTH - spacing.xl * 2,
    maxHeight: "80%",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  title: {
    ...typography.heading3,
    color: colors.textPrimary,
  } as TextStyle,

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default {
  screen: screenStyles,
  card: cardStyles,
  text: textStyles,
  button: buttonStyles,
  input: inputStyles,
  layout: layoutStyles,
  divider: dividerStyles,
  modal: modalStyles,
};
