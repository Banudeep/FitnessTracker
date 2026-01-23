import React from "react";
import { TouchableOpacity, Text, StyleSheet, Dimensions } from "react-native";
import { spacing, borderRadius } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 2.3;

interface WorkoutCardProps {
  name: string;
  date: string;
  exercises: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  sessionId: string;
  onPress: () => void;
}

export function WorkoutCard({
  name,
  date,
  exercises,
  icon: Icon,
  sessionId,
  onPress,
}: WorkoutCardProps) {
  const colors = useColors();
  
  return (
    <TouchableOpacity
      style={[styles.workoutCard, { backgroundColor: colors.bgCard }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon size={24} color={colors.textSecondary} />
      <Text style={[styles.workoutCardName, { color: colors.textPrimary }]}>{name}</Text>
      <Text style={[styles.workoutCardDate, { color: colors.textSecondary }]}>{date}</Text>
      <Text style={[styles.workoutCardExercises, { color: colors.textMuted }]} numberOfLines={2}>
        {exercises}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  workoutCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginRight: spacing.md,
  },
  workoutCardName: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  workoutCardDate: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  workoutCardExercises: {
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});

