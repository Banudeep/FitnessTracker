import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TrendingUp,
  Calendar,
  Dumbbell,
  Flame,
  Trophy,
  ChevronDown,
  Clock,
  Ruler,
  Activity,
  Target,
  BarChart3,
} from "lucide-react-native";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { useProgressStore } from "../../src/stores/progressStore";
import { useSettingsStore } from "../../src/stores/settingsStore";
import { useMeasurementStore } from "../../src/stores/measurementStore";
import { useExerciseStore } from "../../src/stores/exerciseStore";
import { BottomSheet } from "../../src/components/ui";
import {
  categoryLabels,
  builtInExercises,
} from "../../src/constants/exercises";
import type { ExerciseCategory } from "../../src/types";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  StatCard,
  MonthNavigator,
  MonthlyChart,
  ProgressiveOverloadChart,
  MuscleGroupChart,
  MonthCalendar,
  BodyMeasurementsChart,
  MuscleRecoveryStatus,
  TrainingBalanceChart,
  VolumeTrendsChart,
} from "../../src/components/progress";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper function to get exercise category
const getExerciseCategory = (
  exerciseName: string,
  exercises: any[]
): ExerciseCategory => {
  const exercise = exercises.find((e) => e.name === exerciseName);
  return exercise?.category || "other";
};

// Map categories to "Big 5" Muscle Groups
const getMuscleGroup = (category: ExerciseCategory): string => {
  switch (category) {
    case "chest":
      return "Chest";
    case "back":
      return "Back";
    case "shoulders":
      return "Shoulders";
    case "biceps":
    case "triceps":
      return "Arms";
    case "quads":
    case "hamstrings":
    case "glutes":
    case "calves":
      return "Legs";
    default:
      return "Other";
  }
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const themeColors = useColors(); // Dynamic theme colors
  const styles = useMemo(() => createStyles(themeColors), [themeColors]); // Dynamic styles
  const params = useLocalSearchParams<{
    month?: string;
    year?: string;
    monthIndex?: string;
  }>();
  const recentSessions = useWorkoutStore((state) => state.recentSessions);
  const personalRecords = useProgressStore((state) => state.personalRecords);
  const recalculatePRs = useProgressStore((state) => state.recalculatePRs);
  const exercises = useExerciseStore((state) => state.exercises);
  const weeklyGoal = useSettingsStore((state) => state.weeklyGoal);
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const measurements = useMeasurementStore((state) => state.measurements);

  // Find the most recent month with data to default to
  const getDefaultMonth = () => {
    if (recentSessions.length > 0) {
      const mostRecent = recentSessions.find((s) => s.completedAt);
      if (mostRecent?.completedAt) {
        const date = new Date(mostRecent.completedAt);
        return new Date(date.getFullYear(), date.getMonth(), 1);
      }
    }
    return new Date();
  };

  // Get initial month from params or default
  const getInitialMonth = () => {
    if (params.month) {
      // If timestamp is provided
      return new Date(parseInt(params.month));
    } else if (params.year && params.monthIndex) {
      // If year and monthIndex are provided
      return new Date(parseInt(params.year), parseInt(params.monthIndex), 1);
    }
    return getDefaultMonth();
  };

  // State for navigation - use params if provided, otherwise default to month with most recent data
  const [selectedMonth, setSelectedMonth] = useState(() => getInitialMonth());

  // Update selected month when params change
  useEffect(() => {
    if (params.month || (params.year && params.monthIndex)) {
      const newMonth = getInitialMonth();
      setSelectedMonth(newMonth);
      setSelectedWeekIndex(0); // Reset week index when month changes
    }
  }, [params.month, params.year, params.monthIndex]);
  // Week index within the selected month (0 = first week, 1 = second week, etc.)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  // Chart expansion state
  const [expandedCharts, setExpandedCharts] = useState({
    weeklyBreakdown: false,
    progressiveOverload: false,
    muscleGroup: false,
    muscleRecovery: false,
    trainingBalance: false,
    volumeTrends: false,
    bodyMeasurements: true,
  });

  // Day stats modal state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayStats, setShowDayStats] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  // Recalculate PRs on mount to ensure we're using actual workout data (not sample data)
  useEffect(() => {
    if (!isCalculated) {
      recalculatePRs();
      setIsCalculated(true);
    }
  }, [recalculatePRs, isCalculated]);

  const now = new Date();

  // Calculate weeks in selected month (Monday-Sunday calendar weeks)
  const weeksInMonth = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    // Find the Monday of the week containing the 1st
    const firstDayOfWeek = firstOfMonth.getDay();
    const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const firstMonday = new Date(year, month, 1 + mondayOffset);

    const weeks: { start: Date; end: Date }[] = [];
    let weekStart = new Date(firstMonday);

    while (weekStart <= lastOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weeks.push({ start: new Date(weekStart), end: weekEnd });
      weekStart.setDate(weekStart.getDate() + 7);
    }

    return weeks;
  }, [selectedMonth]);

  // Ensure selectedWeekIndex is valid for current month
  const validWeekIndex = Math.min(selectedWeekIndex, weeksInMonth.length - 1);

  // Calculate if we can go to next month/week
  const canGoNextMonth =
    selectedMonth.getMonth() < now.getMonth() ||
    selectedMonth.getFullYear() < now.getFullYear();
  const canGoNextWeek = validWeekIndex < weeksInMonth.length - 1;
  const canGoPrevWeek = validWeekIndex > 0;

  // Get current week dates
  const weekStart = weeksInMonth[validWeekIndex]?.start || new Date();
  const weekEnd = weeksInMonth[validWeekIndex]?.end || new Date();

  // Get sessions for selected month
  const monthSessions = useMemo(() => {
    return recentSessions.filter((session) => {
      if (!session.completedAt) return false;
      if (session.templateName === "Synthetic Workout") return false;
      const date = new Date(session.completedAt);
      return (
        date.getMonth() === selectedMonth.getMonth() &&
        date.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [recentSessions, selectedMonth]);

  // Get sessions for selected week
  const weekSessions = useMemo(() => {
    const weekEndTime = new Date(weekEnd);
    weekEndTime.setHours(23, 59, 59, 999);

    return recentSessions.filter((session) => {
      if (!session.completedAt) return false;
      if (session.templateName === "Synthetic Workout") return false;
      const date = new Date(session.completedAt);
      return date >= weekStart && date <= weekEndTime;
    });
  }, [recentSessions, weekStart, weekEnd]);

  // Calculate monthly stats
  const monthStats = useMemo(() => {
    const totalWorkouts = monthSessions.length;
    const totalVolume = monthSessions.reduce(
      (sum, s) => sum + (s.totalVolume || 0),
      0
    );
    const totalDuration = monthSessions.reduce(
      (sum, s) => sum + (s.durationSeconds || 0),
      0
    );
    const avgDuration =
      monthSessions.length > 0
        ? Math.round(totalDuration / monthSessions.length / 60)
        : 0;

    // Calculate weeks with workouts (for streak)
    const weeksWithWorkouts = new Set<string>();
    monthSessions.forEach((session) => {
      if (session.completedAt) {
        const date = new Date(session.completedAt);
        const weekNum = Math.ceil(date.getDate() / 7);
        weeksWithWorkouts.add(
          `${date.getFullYear()}-${date.getMonth()}-${weekNum}`
        );
      }
    });

    return {
      totalWorkouts,
      totalVolume,
      totalDuration,
      avgDuration,
      weeksActive: weeksWithWorkouts.size,
    };
  }, [monthSessions]);

  // Progressive Overload Data - Weekly volume progression
  const progressiveOverloadData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstOfMonth.getDay();
    const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const firstMonday = new Date(year, month, 1 + mondayOffset);

    const weeks: { week: string; volume: number }[] = [];
    let weekNum = 1;
    let weekStart = new Date(firstMonday);

    while (weekStart <= lastOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekSessions = monthSessions.filter((session) => {
        if (!session.completedAt) return false;
        const date = new Date(session.completedAt);
        return date >= weekStart && date <= weekEnd;
      });

      const weekVolume = weekSessions.reduce(
        (sum, s) => sum + (s.totalVolume || 0),
        0
      );
      weeks.push({ week: `W${weekNum}`, volume: weekVolume });
      weekNum++;
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    return weeks;
  }, [monthSessions, selectedMonth]);

  // Muscle Group Distribution Data
  const muscleGroupData = useMemo(() => {
    const exercises = useExerciseStore.getState().exercises;
    const categoryVolumes = new Map<ExerciseCategory, number>();

    monthSessions.forEach((session) => {
      if (!session.exerciseLogs) return;
      session.exerciseLogs.forEach((log) => {
        const category = getExerciseCategory(log.exerciseName || "", exercises);
        log.sets?.forEach((set) => {
          const volume = (set.weight || 0) * (set.reps || 0);
          categoryVolumes.set(
            category,
            (categoryVolumes.get(category) || 0) + volume
          );
        });
      });
    });

    const totalVolume = Array.from(categoryVolumes.values()).reduce(
      (sum, vol) => sum + vol,
      0
    );
    if (totalVolume === 0) return [];

    const data = Array.from(categoryVolumes.entries())
      .map(([category, volume]) => ({
        category: categoryLabels[category] || category,
        volume,
        percentage: (volume / totalVolume) * 100,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);

    return data;
  }, [monthSessions]);

  // Build workout dates map for calendar (all sessions)
  const workoutDatesMap = useMemo(() => {
    const map = new Map<string, number>();
    recentSessions.forEach((session) => {
      if (!session.completedAt) return;
      const date = new Date(session.completedAt);
      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      map.set(dateStr, (map.get(dateStr) || 0) + 1);
    });
    return map;
  }, [recentSessions]);

  // Calculate week stats
  const weekStats = useMemo(() => {
    const totalWorkouts = weekSessions.length;
    const totalVolume = weekSessions.reduce(
      (sum, s) => sum + (s.totalVolume || 0),
      0
    );

    // Days worked out
    const daysWorkedOut = new Set<string>();
    weekSessions.forEach((session) => {
      if (session.completedAt) {
        daysWorkedOut.add(new Date(session.completedAt).toDateString());
      }
    });

    return {
      totalWorkouts,
      totalVolume,
      daysActive: daysWorkedOut.size,
    };
  }, [weekSessions]);

  // Weekly chart data for selected week
  const weeklyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);

      const count = recentSessions.filter((session) => {
        if (!session.completedAt) return false;
        const sessionDate = new Date(session.completedAt);
        return sessionDate.toDateString() === date.toDateString();
      }).length;

      return { day, count, date };
    });
  }, [recentSessions, weekStart]);

  // Monthly breakdown by calendar weeks (Monday-Sunday)
  const monthlyWeekData = useMemo(() => {
    const weeks: { week: string; count: number }[] = [];
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // Get first day of month
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    // Find the Monday of the week containing the 1st
    const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sunday
    const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const firstMonday = new Date(year, month, 1 + mondayOffset);

    let weekNum = 1;
    let weekStart = new Date(firstMonday);

    while (weekStart <= lastOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const count = monthSessions.filter((session) => {
        if (!session.completedAt) return false;
        const date = new Date(session.completedAt);
        return date >= weekStart && date <= weekEnd;
      }).length;

      weeks.push({ week: `W${weekNum}`, count });
      weekNum++;
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    return weeks;
  }, [monthSessions, selectedMonth]);

  // Calculate streak based on actual workout data and weekly goal (consecutive weeks only)
  // Uses unique workout days per week, excludes current incomplete week
  const streakData = useMemo(() => {
    // Get current week's Monday
    const today = new Date();
    const todayDay = today.getDay();
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(
      today.getDate() - (todayDay === 0 ? 6 : todayDay - 1)
    );
    currentWeekMonday.setHours(0, 0, 0, 0);
    const currentWeekKey = currentWeekMonday.toISOString().split("T")[0];

    // Track unique workout days per week (not total sessions)
    const weeklyUniqueDays = new Map<string, Set<string>>();

    recentSessions.forEach((session) => {
      if (!session.completedAt) return;
      const date = new Date(session.completedAt);
      // Get Monday of that week
      const dayOfWeek = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().split("T")[0];
      const dateKey = date.toDateString();

      // Track unique days per week
      if (!weeklyUniqueDays.has(weekKey)) {
        weeklyUniqueDays.set(weekKey, new Set());
      }
      weeklyUniqueDays.get(weekKey)!.add(dateKey);
    });

    // Convert to counts (unique days per week)
    const weeklyWorkouts = new Map<string, number>();
    weeklyUniqueDays.forEach((days, weekKey) => {
      weeklyWorkouts.set(weekKey, days.size);
    });

    // Sort weeks by date (oldest first), excluding current incomplete week for streak calculation
    const allWeeks = Array.from(weeklyWorkouts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    // For streak calculation, exclude current incomplete week
    const completedWeeks = allWeeks.filter(
      ([weekKey]) => weekKey < currentWeekKey
    );

    // Build week info
    const weekInfo: { weekStart: string; count: number; meetsGoal: boolean }[] =
      [];

    let bestStreak = 0;
    let tempStreak = 0;
    let prevMonday: Date | null = null;

    for (const [weekKey, count] of completedWeeks) {
      const currentMonday = new Date(weekKey);

      const isConsecutive =
        prevMonday === null ||
        currentMonday.getTime() - prevMonday.getTime() ===
          7 * 24 * 60 * 60 * 1000;

      const meetsGoal = count >= weeklyGoal;
      weekInfo.push({
        weekStart: weekKey,
        count,
        meetsGoal,
      });

      if (meetsGoal && isConsecutive) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else if (meetsGoal) {
        tempStreak = 1;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }

      prevMonday = currentMonday;
    }

    // Calculate current streak from most recent completed week backwards
    // Current incomplete week is NOT counted
    const sortedWeeksDesc = [...completedWeeks].reverse();
    let currentStreak = 0;
    prevMonday = null;

    for (const [weekKey, count] of sortedWeeksDesc) {
      const currentMondayDate = new Date(weekKey);

      // Check if this week is consecutive to our tracking
      let isConsecutive: boolean;
      if (prevMonday === null) {
        // First iteration - check if it's the week immediately before current week
        isConsecutive =
          currentWeekMonday.getTime() - currentMondayDate.getTime() ===
          7 * 24 * 60 * 60 * 1000;
      } else {
        isConsecutive =
          prevMonday.getTime() - currentMondayDate.getTime() ===
          7 * 24 * 60 * 60 * 1000;
      }

      if (count >= weeklyGoal && isConsecutive) {
        currentStreak++;
        prevMonday = currentMondayDate;
      } else if (count >= weeklyGoal && prevMonday === null) {
        // Week meets goal but not consecutive to current week - still start streak
        currentStreak = 1;
        prevMonday = currentMondayDate;
      } else {
        break;
      }
    }

    // Best streak is the maximum of historical best and current ongoing streak
    bestStreak = Math.max(bestStreak, currentStreak);

    return { currentStreak, bestStreak, weekInfo };
  }, [recentSessions, weeklyGoal]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
    return volume.toString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0 min";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  // Calculate stats for selected date
  const dayStats = useMemo(() => {
    if (!selectedDate) return null;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const daySessions = recentSessions.filter((session) => {
      if (!session.completedAt) return false;
      if (session.templateName === "Synthetic Workout") return false;
      const sessionDate = new Date(session.completedAt);
      return sessionDate >= startOfDay && sessionDate <= endOfDay;
    });

    const totalWorkouts = daySessions.length;
    const totalVolume = daySessions.reduce(
      (sum, s) => sum + (s.totalVolume || 0),
      0
    );
    const totalDuration = daySessions.reduce(
      (sum, s) => sum + (s.durationSeconds || 0),
      0
    );
    const exercises = new Set<string>();
    daySessions.forEach((session) => {
      session.exerciseLogs?.forEach((log: any) => {
        if (log.exerciseName) {
          exercises.add(log.exerciseName);
        }
      });
    });

    return {
      date: selectedDate,
      totalWorkouts,
      totalVolume,
      totalDuration,
      exercises: Array.from(exercises),
      sessions: daySessions,
    };
  }, [selectedDate, recentSessions]);

  const navigateMonth = (direction: number) => {
    setSelectedMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
    // Reset to first week when changing months
    setSelectedWeekIndex(0);
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: themeColors.bgPrimary }]} showsVerticalScrollIndicator={false}>

        {/* Streak Stats */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>STREAKS</Text>
          <View style={styles.streakSection}>
            <View style={styles.streakCard}>
              <View style={styles.streakIconContainer}>
                <Flame size={24} color={themeColors.streakFire} />
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakValue}>
                  {streakData.currentStreak}
                </Text>
                <Text style={styles.streakLabel}>Current Streak</Text>
              </View>
              <Text style={styles.streakUnit}>weeks</Text>
            </View>
            <View style={styles.streakCard}>
              <View style={styles.streakIconContainer}>
                <Trophy size={24} color={themeColors.prGold} />
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakValue}>{streakData.bestStreak}</Text>
                <Text style={styles.streakLabel}>Best Streak</Text>
              </View>
              <Text style={styles.streakUnit}>weeks</Text>
            </View>
          </View>
        </View>

        {/* Monthly Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>MONTHLY OVERVIEW</Text>

          {/* Month Navigator - Improved */}
          <View style={styles.monthNavigator}>
            <TouchableOpacity
              style={styles.monthNavButton}
              onPress={() => navigateMonth(-1)}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.monthNavCenter}>
              <Text style={styles.monthNavTitle}>
                {selectedMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.monthNavSubtitle}>
                {monthStats.totalWorkouts} workouts this month
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.monthNavButton,
                !canGoNextMonth && styles.monthNavButtonDisabled,
              ]}
              onPress={() => canGoNextMonth && navigateMonth(1)}
              activeOpacity={0.7}
              disabled={!canGoNextMonth}
            >
              <ChevronRight
                size={24}
                color={canGoNextMonth ? themeColors.textPrimary : themeColors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Monthly Calendar */}
          <MonthCalendar
            month={selectedMonth}
            workoutDates={workoutDatesMap}
            weeklyGoal={weeklyGoal}
            onDayPress={(date) => {
              setSelectedDate(date);
              setShowDayStats(true);
            }}
          />

          {/* Monthly Stats - Better Grid Layout */}
          <Text style={styles.statsTitle}>Monthly Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCardLarge}>
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: themeColors.accentPrimary + "20" },
                ]}
              >
                <Dumbbell size={20} color={themeColors.accentPrimary} />
              </View>
              <Text style={styles.statCardValue}>
                {monthStats.totalWorkouts}
              </Text>
              <Text style={styles.statCardLabel}>Workouts</Text>
            </View>
            <View style={styles.statCardLarge}>
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: themeColors.accentSecondary + "20" },
                ]}
              >
                <TrendingUp size={20} color={themeColors.accentSecondary} />
              </View>
              <Text style={styles.statCardValue}>
                {formatVolume(monthStats.totalVolume)}
              </Text>
              <Text style={styles.statCardLabel}>Total Volume</Text>
            </View>
            <View style={styles.statCardLarge}>
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: themeColors.accentInfo + "20" },
                ]}
              >
                <Clock size={20} color={themeColors.accentInfo} />
              </View>
              <Text style={styles.statCardValue}>
                {monthStats.avgDuration} min
              </Text>
              <Text style={styles.statCardLabel}>Avg Time</Text>
            </View>
            <View style={styles.statCardLarge}>
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: themeColors.accentWarning + "20" },
                ]}
              >
                <Clock size={20} color={themeColors.accentWarning} />
              </View>
              <Text style={styles.statCardValue}>
                {formatDuration(monthStats.totalDuration)}
              </Text>
              <Text style={styles.statCardLabel}>Total Time</Text>
            </View>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>ANALYTICS</Text>

          {/* Monthly Breakdown Chart */}
          <View style={styles.chartContainer}>
            <TouchableOpacity
              style={styles.chartHeader}
              onPress={() =>
                setExpandedCharts((prev) => ({
                  ...prev,
                  weeklyBreakdown: !prev.weeklyBreakdown,
                }))
              }
            >
              <Text style={styles.chartTitle}>Weekly Breakdown</Text>
              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={[
                  styles.chevronIcon,
                  expandedCharts.weeklyBreakdown && styles.chevronIconRotated,
                ]}
              />
            </TouchableOpacity>
            {expandedCharts.weeklyBreakdown && (
              <MonthlyChart data={monthlyWeekData} />
            )}
          </View>

          {/* Progressive Overload Chart */}
          {progressiveOverloadData.length > 0 &&
            progressiveOverloadData.some((d) => d.volume > 0) && (
              <View style={styles.chartContainer}>
                <TouchableOpacity
                  style={styles.chartHeader}
                  onPress={() =>
                    setExpandedCharts((prev) => ({
                      ...prev,
                      progressiveOverload: !prev.progressiveOverload,
                    }))
                  }
                >
                  <Text style={styles.chartTitle}>Progressive Overload</Text>
                  <ChevronDown
                    size={20}
                    color={colors.textSecondary}
                    style={[
                      styles.chevronIcon,
                      expandedCharts.progressiveOverload &&
                        styles.chevronIconRotated,
                    ]}
                  />
                </TouchableOpacity>
                {expandedCharts.progressiveOverload && (
                  <ProgressiveOverloadChart data={progressiveOverloadData} />
                )}
              </View>
            )}

          {/* Muscle Group Distribution */}
          {muscleGroupData.length > 0 && (
            <View style={styles.chartContainer}>
              <TouchableOpacity
                style={styles.chartHeader}
                onPress={() =>
                  setExpandedCharts((prev) => ({
                    ...prev,
                    muscleGroup: !prev.muscleGroup,
                  }))
                }
              >
                <Text style={styles.chartTitle}>Muscle Group Distribution</Text>
                <ChevronDown
                  size={20}
                  color={colors.textSecondary}
                  style={[
                    styles.chevronIcon,
                    expandedCharts.muscleGroup && styles.chevronIconRotated,
                  ]}
                />
              </TouchableOpacity>
              {expandedCharts.muscleGroup && (
                <MuscleGroupChart data={muscleGroupData} />
              )}
            </View>
          )}

          {/* Muscle Recovery Status */}
          <View style={styles.chartContainer}>
            <TouchableOpacity
              style={styles.chartHeader}
              onPress={() =>
                setExpandedCharts((prev) => ({
                  ...prev,
                  muscleRecovery: !prev.muscleRecovery,
                }))
              }
            >
              <View style={styles.chartTitleRow}>
                <Activity size={18} color={colors.accentInfo} />
                <Text style={styles.chartTitle}>Muscle Recovery Status</Text>
              </View>
              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={[
                  styles.chevronIcon,
                  expandedCharts.muscleRecovery && styles.chevronIconRotated,
                ]}
              />
            </TouchableOpacity>
            {expandedCharts.muscleRecovery && (
              <MuscleRecoveryStatus
                sessions={recentSessions}
                exercises={useExerciseStore.getState().exercises}
                getExerciseCategory={getExerciseCategory}
              />
            )}
          </View>

          {/* Training Balance Radar Chart */}
          <View style={styles.chartContainer}>
            <TouchableOpacity
              style={styles.chartHeader}
              onPress={() =>
                setExpandedCharts((prev) => ({
                  ...prev,
                  trainingBalance: !prev.trainingBalance,
                }))
              }
            >
              <View style={styles.chartTitleRow}>
                <Target size={18} color={colors.accentPrimary} />
                <Text style={styles.chartTitle}>Training Balance</Text>
              </View>
              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={[
                  styles.chevronIcon,
                  expandedCharts.trainingBalance && styles.chevronIconRotated,
                ]}
              />
            </TouchableOpacity>
            {expandedCharts.trainingBalance && (
              <TrainingBalanceChart
                sessions={recentSessions}
                exercises={useExerciseStore.getState().exercises}
                getExerciseCategory={getExerciseCategory}
                timeRange="month"
              />
            )}
          </View>

          {/* Volume Trends Per Muscle Group */}
          <View style={styles.chartContainer}>
            <TouchableOpacity
              style={styles.chartHeader}
              onPress={() =>
                setExpandedCharts((prev) => ({
                  ...prev,
                  volumeTrends: !prev.volumeTrends,
                }))
              }
            >
              <View style={styles.chartTitleRow}>
                <BarChart3 size={18} color={colors.accentSecondary} />
                <Text style={styles.chartTitle}>Volume Trends</Text>
              </View>
              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={[
                  styles.chevronIcon,
                  expandedCharts.volumeTrends && styles.chevronIconRotated,
                ]}
              />
            </TouchableOpacity>
            {expandedCharts.volumeTrends && (
              <VolumeTrendsChart
                sessions={recentSessions}
                exercises={useExerciseStore.getState().exercises}
                getExerciseCategory={getExerciseCategory}
              />
            )}
          </View>
        </View>

        {/* PRs Summary */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>PERSONAL RECORDS</Text>
          <View style={styles.prSection}>
            <View style={styles.prHeader}>
              <Trophy size={20} color={colors.prGold} />
              <Text style={styles.prTitle}>Your Best Lifts</Text>
            </View>
            {personalRecords.length > 0 ? (
              <View style={styles.prList}>
                {(() => {
                  // Group PRs by Big 5 Muscle Groups
                  const bestByGroup = new Map<string, typeof personalRecords[0]>();
                  
                  personalRecords.forEach(pr => {
                    const category = getExerciseCategory(pr.exerciseName, exercises);
                    const group = getMuscleGroup(category);
                    
                    if (group === "Other") return; // Skip non-main groups
                    
                    const existing = bestByGroup.get(group);
                    // Simple heuristic: Heavier weight is "better" to represent the group
                    if (!existing || pr.weight > existing.weight) {
                      bestByGroup.set(group, pr);
                    }
                  });

                  // Ensure strict order: Chest, Back, Legs, Shoulders, Arms
                  const orderedGroups = ["Chest", "Back", "Legs", "Shoulders", "Arms"];
                  
                  return orderedGroups.map(group => {
                    const pr = bestByGroup.get(group);
                    if (!pr) return null;
                    
                    return (
                      <View key={group} style={styles.prItem}>
                        <View style={styles.prGroupContainer}>
                          <Text style={styles.prGroupLabel}>{group}</Text>
                          <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                        </View>
                        <Text style={styles.prValue}>
                          {pr.weight} {preferredUnit} × {pr.reps}
                        </Text>
                      </View>
                    );
                  });
                })()}
              </View>
            ) : (
              <Text style={styles.prEmpty}>
                Complete workouts to set personal records!
              </Text>
            )}
          </View>
        </View>

        {/* Body Measurements Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>BODY MEASUREMENTS</Text>
          <View style={styles.chartContainer}>
            <TouchableOpacity
              style={styles.chartHeader}
              onPress={() =>
                setExpandedCharts((prev) => ({
                  ...prev,
                  bodyMeasurements: !prev.bodyMeasurements,
                }))
              }
            >
              <View style={styles.chartTitleRow}>
                <Ruler size={18} color={colors.accentSecondary} />
                <Text style={styles.chartTitle}>Progress Tracking</Text>
              </View>
              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={[
                  styles.chevronIcon,
                  expandedCharts.bodyMeasurements && styles.chevronIconRotated,
                ]}
              />
            </TouchableOpacity>
            {expandedCharts.bodyMeasurements && (
              <BodyMeasurementsChart
                measurements={measurements}
                preferredUnit={preferredUnit}
              />
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Day Stats Modal */}
      <BottomSheet
        visible={showDayStats}
        onClose={() => {
          setShowDayStats(false);
          setSelectedDate(null);
        }}
        title={
          selectedDate
            ? selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Day Stats"
        }
      >
        {dayStats ? (
          <View style={styles.dayStatsContainer}>
            <View style={styles.dayStatsRow}>
              <StatCard
                icon={Dumbbell}
                label="Workouts"
                value={dayStats.totalWorkouts}
                color={colors.accentPrimary}
                small
              />
              <StatCard
                icon={TrendingUp}
                label="Volume"
                value={formatVolume(dayStats.totalVolume)}
                color={colors.accentSecondary}
                small
              />
              <StatCard
                icon={Clock}
                label="Duration"
                value={formatDuration(dayStats.totalDuration)}
                color={colors.accentInfo}
                small
              />
            </View>

            {dayStats.exercises.length > 0 && (
              <View style={styles.dayStatsSection}>
                <Text style={styles.dayStatsSectionTitle}>Exercises</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.exercisesScrollContent}
                >
                  {dayStats.exercises.map((exercise, index) => (
                    <View key={index} style={styles.exerciseItem}>
                      <Text style={styles.exerciseName}>{exercise}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {dayStats.sessions.length > 0 && (
              <View style={styles.dayStatsSection}>
                <Text style={styles.dayStatsSectionTitle}>Workouts</Text>
                {dayStats.sessions.map((session, index) => (
                  <View key={session.id || index} style={styles.sessionItem}>
                    <Text style={styles.sessionName}>
                      {session.templateName || "Workout"}
                    </Text>
                    <View style={styles.sessionMeta}>
                      {session.totalVolume != null && (
                        <Text style={styles.sessionMetaText}>
                          {formatVolume(session.totalVolume)} volume
                        </Text>
                      )}
                      {session.durationSeconds != null && (
                        <Text style={styles.sessionMetaText}>
                          {formatDuration(session.durationSeconds)}
                        </Text>
                      )}
                      {session.exerciseLogs?.length > 0 && (
                        <Text style={styles.sessionMetaText}>
                          {session.exerciseLogs.length}{" "}
                          {session.exerciseLogs.length === 1
                            ? "exercise"
                            : "exercises"}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {dayStats.totalWorkouts === 0 && (
              <View style={styles.emptyDayState}>
                <Text style={styles.emptyDayText}>No workouts on this day</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyDayState}>
            <Text style={styles.emptyDayText}>Loading...</Text>
          </View>
        )}
      </BottomSheet>
    </>
  );
}

// Dynamic styles creator function
const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
  },
  headerSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  header: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionContainer: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  streakSection: {
    flexDirection: "row",
    gap: spacing.md,
  },
  streakCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  streakIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  streakInfo: {
    flex: 1,
  },
  streakValue: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  streakLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  streakUnit: {
    ...typography.caption,
    color: colors.textMuted,
  },
  monthNavigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavButtonDisabled: {
    opacity: 0.4,
  },
  monthNavCenter: {
    flex: 1,
    alignItems: "center",
  },
  monthNavTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  monthNavSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statCardLarge: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2 - 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statCardValue: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statCardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  calendarContainer: {
    backgroundColor: colors.bgSecondary,
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
    color: colors.textMuted,
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
  calendarCellActive: {
    backgroundColor: colors.accentPrimary + "20",
    borderRadius: borderRadius.md,
  },
  calendarDay: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  calendarDayActive: {
    color: colors.accentPrimary,
    fontWeight: "700",
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPrimary,
    marginTop: 2,
  },
  bottomPaddingExtra: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  navigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgSecondary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  navTitleSmall: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
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
    color: colors.textPrimary,
  },
  statValueSmall: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekStatsRow: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  weekStatItem: {
    flex: 1,
    alignItems: "center",
  },
  weekStatValue: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  weekStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  weekStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  chartContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  chartTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  chevronIcon: {
    transform: [{ rotate: "0deg" }],
  },
  chevronIconRotated: {
    transform: [{ rotate: "180deg" }],
  },
  chart: {
    alignItems: "center",
  },
  monthlyBars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    paddingTop: spacing.md,
  },
  monthlyBarContainer: {
    flex: 1,
    alignItems: "center",
    maxWidth: 50,
  },
  monthlyBarValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  monthlyBarTrack: {
    width: 32,
    height: 70,
    backgroundColor: colors.bgTertiary,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  monthlyBarFill: {
    width: "100%",
    backgroundColor: colors.accentSecondary,
    borderRadius: 6,
  },
  monthlyBarLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  prSection: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  prHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  prTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  prList: {},
  prItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prGroupContainer: {
    gap: 2,
  },
  prGroupLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  prExercise: {
    ...typography.body,
    color: colors.textPrimary,
  },
  prValue: {
    ...typography.body,
    color: colors.prGold,
    fontWeight: "600",
  },
  prEmpty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  bottomPadding: {
    height: 100,
  },
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
    color: colors.textPrimary,
    flex: 1,
  },
  muscleGroupValue: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  muscleGroupBarTrack: {
    height: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  muscleGroupBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  muscleGroupPercentage: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  dayStatsContainer: {
    padding: spacing.md,
  },
  dayStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dayStatsSection: {
    marginBottom: spacing.lg,
  },
  dayStatsSectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  exercisesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  exercisesScrollContent: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  exerciseItem: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseName: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  sessionItem: {
    backgroundColor: colors.bgTertiary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  sessionMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sessionMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyDayState: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyDayText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
