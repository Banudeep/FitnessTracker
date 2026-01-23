import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Dimensions,
} from "react-native";
import { spacing, borderRadius } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 2.3;

interface MonthCardProps {
  month: string;
  workouts: number;
  icon: React.ComponentType<{ size: number; color: string }>;
  onPress?: () => void;
}

export function MonthCard({
  month,
  workouts,
  icon: Icon,
  onPress,
}: MonthCardProps) {
  const colors = useColors();
  
  return (
    <TouchableOpacity
      style={[styles.monthCard, { backgroundColor: colors.bgSecondary }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Icon size={20} color={colors.textSecondary} />
      <Text style={[styles.monthName, { color: colors.textPrimary }]}>{month}</Text>
      <View style={[styles.monthProgressBar, { backgroundColor: colors.bgTertiary }]}>
        <View
          style={[
            styles.monthProgressFill,
            { width: `${Math.min((workouts / 30) * 100, 100)}%`, backgroundColor: colors.accentSecondary },
          ]}
        />
      </View>
      <Text style={[styles.monthWorkouts, { color: colors.accentPrimary }]}>{workouts} workouts</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  monthCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginRight: spacing.md,
  },
  monthName: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  monthProgressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  monthProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  monthWorkouts: {
    fontSize: 12,
    marginTop: spacing.sm,
    fontWeight: "500",
  },
});

