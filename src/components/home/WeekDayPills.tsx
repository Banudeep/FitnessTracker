import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { spacing } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface WeekDayPillsProps {
  workoutsThisWeek: Date[];
  weeklyGoal: number;
  recentSessions: any[];
  onDayPress?: (date: Date, workouts: any[]) => void;
}

export function WeekDayPills({
  workoutsThisWeek,
  weeklyGoal,
  recentSessions,
  onDayPress,
}: WeekDayPillsProps) {
  const colors = useColors();
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  const todayDay = today.getDay();
  const startOfWeek = new Date(today);
  // Get Monday of current week (0 = Sunday, 1 = Monday, etc.)
  startOfWeek.setDate(today.getDate() - (todayDay === 0 ? 6 : todayDay - 1));

  const getDatesForWeek = () => {
    return days.map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return date;
    });
  };

  const weekDates = getDatesForWeek();

  const isWorkoutDay = (date: Date) => {
    return workoutsThisWeek.some(
      (workoutDate) =>
        workoutDate.getDate() === date.getDate() &&
        workoutDate.getMonth() === date.getMonth() &&
        workoutDate.getFullYear() === date.getFullYear()
    );
  };

  const getWorkoutsForDate = (date: Date) => {
    if (!recentSessions || !Array.isArray(recentSessions)) {
      return [];
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return recentSessions.filter((session) => {
      if (!session.completedAt || session.templateName === "Synthetic Workout")
        return false;
      const sessionDate = new Date(session.completedAt);
      return sessionDate >= startOfDay && sessionDate <= endOfDay;
    });
  };

  return (
    <View style={styles.weekContainer}>
      <View style={styles.weekHeader}>
        <Text style={[styles.weekTitle, { color: colors.textSecondary }]}>THIS WEEK</Text>
        <Text style={[styles.weekCount, { color: colors.textSecondary }]}>
          {workoutsThisWeek.length} of {weeklyGoal}
        </Text>
      </View>
      <View style={styles.daysRow}>
        {days.map((day, index) => {
          const date = weekDates[index];
          const completed = isWorkoutDay(date);
          const isToday = date.toDateString() === today.toDateString();
          const dayWorkouts = getWorkoutsForDate(date);
          const hasWorkouts = dayWorkouts.length > 0;

          return (
            <View key={index} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day}</Text>
              <TouchableOpacity
                style={[
                  styles.dayPill,
                  { backgroundColor: colors.bgTertiary },
                  hasWorkouts && { backgroundColor: colors.checkmark },
                  isToday && !hasWorkouts && { borderWidth: 1, borderColor: colors.accentPrimary },
                ]}
                onPress={() => {
                  if (hasWorkouts && onDayPress) {
                    onDayPress(date, dayWorkouts);
                  }
                }}
                activeOpacity={0.7}
                disabled={!onDayPress || !hasWorkouts}
              >
                <Text
                  style={[
                    hasWorkouts 
                      ? [styles.checkmark, { color: colors.textPrimary }] 
                      : [styles.dayNumber, { color: colors.textSecondary }],
                    isToday && !hasWorkouts && { color: colors.accentPrimary },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekContainer: {},
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  weekTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  weekCount: {
    fontSize: 12,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  dayPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "700",
  },
});

