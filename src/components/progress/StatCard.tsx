import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface StatCardProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value: string | number;
  color?: string;
  small?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  color,
  small = false,
}: StatCardProps) {
  const colors = useColors();
  const iconColor = color || colors.accentPrimary;
  
  return (
    <View style={[styles.statCard, { backgroundColor: colors.bgSecondary }, small && styles.statCardSmall]}>
      <View
        style={[styles.statIconContainer, { backgroundColor: `${iconColor}20` }]}
      >
        <Icon size={small ? 16 : 20} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }, small && styles.statValueSmall]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statCardSmall: {
    padding: spacing.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.heading3,
  },
  statValueSmall: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

