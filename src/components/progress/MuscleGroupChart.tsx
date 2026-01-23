import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors as defaultColors, spacing, typography } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface MuscleGroupChartProps {
  data: { category: string; volume: number; percentage: number }[];
}

// categoryColors moved inside component for dynamic theming

export function MuscleGroupChart({ data }: MuscleGroupChartProps) {
  const colors = useColors();

  const categoryColors: Record<string, string> = {
    Chest: colors.accentPrimary,
    Back: colors.accentSecondary,
    Shoulders: colors.accentInfo,
    Biceps: "#FF6B6B",
    Triceps: "#4ECDC4",
    Quads: "#95E1D3",
    Hamstrings: "#F38181",
    Glutes: "#AA96DA",
    Calves: "#FCBAD3",
    Core: "#FFD93D",
    "Full Body": colors.textSecondary,
  };
  return (
    <View style={styles.muscleGroupContainer}>
      {data.map((item, index) => (
        <View key={`${item.category}-${index}`} style={styles.muscleGroupItem}>
          <View style={styles.muscleGroupHeader}>
            <View
              style={[
                styles.muscleGroupColorDot,
                {
                  backgroundColor:
                    categoryColors[item.category] || colors.accentPrimary,
                },
              ]}
            />
            <Text style={[styles.muscleGroupLabel, { color: colors.textPrimary }]}>{item.category}</Text>
            <Text style={[styles.muscleGroupValue, { color: colors.textSecondary }]}>
              {item.percentage.toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.muscleGroupBarTrack, { backgroundColor: colors.bgTertiary }]}>
            <View
              style={[
                styles.muscleGroupBarFill,
                {
                  width: `${item.percentage}%`,
                  backgroundColor:
                    categoryColors[item.category] || colors.accentPrimary,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  muscleGroupContainer: {
    gap: spacing.md,
  },
  muscleGroupItem: {
    marginBottom: spacing.md,
  },
  muscleGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  muscleGroupColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  muscleGroupLabel: {
    ...typography.body,
    color: defaultColors.textPrimary,
    flex: 1,
  },
  muscleGroupValue: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  muscleGroupBarTrack: {
    height: 8,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  muscleGroupBarFill: {
    height: "100%",
    borderRadius: 4,
  },
});
