import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { spacing, typography } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Icon component to display (should be a lucide-react-native icon) */
  icon?: React.ReactNode;
  /** Icon background color (defaults to accent color with 20% opacity) */
  iconBackground?: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Action button text (shows chevron if provided) */
  actionText?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Custom right element instead of action button */
  rightElement?: React.ReactNode;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Additional style for container */
  style?: object;
}

export function SectionHeader({
  title,
  icon,
  iconBackground,
  subtitle,
  actionText,
  onAction,
  rightElement,
  size = "medium",
  style,
}: SectionHeaderProps) {
  const colors = useColors();
  const resolvedIconBackground = iconBackground || colors.accentPrimary + "20";
  const sizes = {
    small: {
      iconSize: 28,
      iconPadding: 6,
      titleStyle: typography.body,
      gap: spacing.sm,
    },
    medium: {
      iconSize: 36,
      iconPadding: 8,
      titleStyle: typography.heading3,
      gap: spacing.md,
    },
    large: {
      iconSize: 44,
      iconPadding: 10,
      titleStyle: typography.heading2,
      gap: spacing.lg,
    },
  };

  const currentSize = sizes[size];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftContent}>
        {icon && (
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: resolvedIconBackground,
                width: currentSize.iconSize,
                height: currentSize.iconSize,
                borderRadius: currentSize.iconSize / 2,
              },
            ]}
          >
            {icon}
          </View>
        )}
        <View
          style={[
            styles.textContainer,
            { marginLeft: icon ? currentSize.gap : 0 },
          ]}
        >
          <Text style={[styles.title, currentSize.titleStyle, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>

      {rightElement ? (
        rightElement
      ) : actionText && onAction ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.actionText, { color: colors.accentPrimary }]}>{actionText}</Text>
          <ChevronRight size={16} color={colors.accentPrimary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    ...typography.body,
    fontWeight: "500",
  },
});
