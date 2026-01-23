import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface MonthCalendarProps {
  month: Date;
  workoutDates: Map<string, number>;
  weeklyGoal: number;
  onDayPress?: (date: Date) => void;
}

export function MonthCalendar({
  month,
  workoutDates,
  weeklyGoal,
  onDayPress,
}: MonthCalendarProps) {
  const colors = useColors();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get what day of the week the month starts (0 = Sunday)
  const startDayOfWeek = firstDay.getDay();
  // Shift to make Monday = 0
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Build calendar grid
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the 1st
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }

  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Fill remaining cells to complete the last row
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  // Group into weeks
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Check if a date had a workout
  const getWorkoutCount = (day: number) => {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    return workoutDates.get(dateStr) || 0;
  };

  return (
    <View style={[styles.calendarContainer, { backgroundColor: colors.bgSecondary }]}>
      {/* Day labels */}
      <View style={styles.calendarHeader}>
        {dayLabels.map((label) => (
          <View key={label} style={styles.calendarHeaderCell}>
            <Text style={[styles.calendarHeaderText, { color: colors.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.calendarRow}>
          {week.map((day, dayIndex) => {
            const workoutCount = day ? getWorkoutCount(day) : 0;
            const hasWorkout = workoutCount > 0;

            const handlePress = () => {
              if (day !== null && onDayPress) {
                const date = new Date(year, monthIndex, day);
                onDayPress(date);
              }
            };

            return (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.calendarCell,
                  hasWorkout && { backgroundColor: colors.accentPrimary + "20", borderRadius: borderRadius.md },
                ]}
                onPress={handlePress}
                disabled={day === null}
                activeOpacity={0.7}
              >
                {day !== null && (
                  <>
                    <Text
                      style={[
                        styles.calendarDay,
                        { color: colors.textSecondary },
                        hasWorkout && { color: colors.accentPrimary, fontWeight: "700" },
                      ]}
                    >
                      {day}
                    </Text>
                    {hasWorkout && <View style={[styles.calendarDot, { backgroundColor: colors.accentPrimary }]} />}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  calendarHeader: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  calendarHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  calendarHeaderText: {
    ...typography.caption,
    fontWeight: "600",
  },
  calendarRow: {
    flexDirection: "row",
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
  calendarDay: {
    ...typography.bodySmall,
    fontWeight: "500",
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
