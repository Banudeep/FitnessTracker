import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Inbox } from "lucide-react-native";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  /** Icon component to display (should be a lucide-react-native icon) */
  icon?: React.ReactNode;
  /** Main title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button text */
  actionText?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Custom style for container */
  style?: object;
  /** Show in a card-like container */
  card?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  size = "medium",
  style,
  card = false,
}: EmptyStateProps) {
  const sizes = {
    small: {
      iconSize: 32,
      iconContainerSize: 56,
      titleStyle: typography.body,
      descriptionStyle: typography.caption,
      padding: spacing.md,
    },
    medium: {
      iconSize: 40,
      iconContainerSize: 72,
      titleStyle: typography.heading3,
      descriptionStyle: typography.body,
      padding: spacing.xl,
    },
    large: {
      iconSize: 48,
      iconContainerSize: 88,
      titleStyle: typography.heading2,
      descriptionStyle: typography.body,
      padding: spacing["2xl"],
    },
  };

  const currentSize = sizes[size];

  const defaultIcon = (
    <Inbox size={currentSize.iconSize} color={colors.textMuted} />
  );

  const content = (
    <View
      style={[
        styles.container,
        { padding: currentSize.padding },
        card && styles.card,
        style,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            width: currentSize.iconContainerSize,
            height: currentSize.iconContainerSize,
            borderRadius: currentSize.iconContainerSize / 2,
          },
        ]}
      >
        {icon || defaultIcon}
      </View>

      <Text style={[styles.title, currentSize.titleStyle]}>{title}</Text>

      {description && (
        <Text style={[styles.description, currentSize.descriptionStyle]}>
          {description}
        </Text>
      )}

      {actionText && onAction && (
        <Button
          title={actionText}
          onPress={onAction}
          variant="primary"
          size={size === "small" ? "sm" : "md"}
          style={styles.actionButton}
        />
      )}
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  actionButton: {
    marginTop: spacing.lg,
  },
});
