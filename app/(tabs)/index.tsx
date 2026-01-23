import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
} from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Plus,
  ChevronRight,
  TrendingUp,
  Target,
  Cloud,
  Dumbbell,
  Play,
  Trash2,
  Edit3,
  Save,
  X,
  Clock,
  Activity,
  Flame,
} from "lucide-react-native";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { useSettingsStore } from "../../src/stores/settingsStore";
import {
  colors as defaultColors,
  spacing,
  borderRadius,
  typography,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import { BottomSheet, Skeleton, ConfirmModal } from "../../src/components/ui";
import {
  WeeklyGoalRing,
  WeekDayPills,
  WorkoutCard,
  MonthCard,
} from "../../src/components/home";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const themeColors = useColors(); // Dynamic theme colors
  const styles = useMemo(() => createStyles(themeColors), [themeColors]); // Dynamic styles
  const recentSessions = useWorkoutStore((state) => state.recentSessions);
  const templates = useWorkoutStore((state) => state.templates);
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const removeSession = useWorkoutStore((state) => state.removeSession);
  const updateSession = useWorkoutStore((state) => state.updateSession);
  const weeklyGoal = useSettingsStore((state) => state.weeklyGoal);
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);

  // State for day workouts dropdown
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<any[]>([]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(
    null
  );

  // State for recent workout detail modal
  const [selectedWorkoutSession, setSelectedWorkoutSession] = useState<
    any | null
  >(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [editedExerciseLogs, setEditedExerciseLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Get unique workout days for this week (counts days, not total workouts)
  const getWorkoutsThisWeek = () => {
    const now = new Date();
    const todayDay = now.getDay();
    const startOfWeek = new Date(now);
    // Get Monday of current week (0 = Sunday, 1 = Monday, etc.)
    startOfWeek.setDate(now.getDate() - (todayDay === 0 ? 6 : todayDay - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    // Get end of week (Sunday 23:59:59)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get unique days (not total workouts)
    const uniqueDays = new Set<string>();
    const workoutDates: Date[] = [];

    recentSessions
      .filter((session) => {
        if (session.templateName === "Synthetic Workout") return false;
        // Only count completed workouts
        if (!session.completedAt) return false;

        const sessionDate = new Date(session.completedAt);

        // Check if session date is within this week
        return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
      })
      .forEach((session) => {
        if (!session.completedAt) return;
        
        const sessionDate = new Date(session.completedAt);
        const date = new Date(sessionDate);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toDateString(); // e.g., "Mon Jan 01 2024"

        // Only add if we haven't seen this day before
        if (!uniqueDays.has(dateKey)) {
          uniqueDays.add(dateKey);
          workoutDates.push(date);
        }
      });
    return workoutDates;
  };

  const workoutsThisWeek = getWorkoutsThisWeek();

  // Check if we have valid recent workouts (excluding synthetic and incomplete)
  const hasRecentWorkouts =
    recentSessions.filter(
      (session) => session.templateName !== "Synthetic Workout" && session.completedAt
    ).length > 0;

  // Check if we have workouts this week
  const hasWorkoutsThisWeek = workoutsThisWeek.length > 0;

  // Calculate best streak from workout data (consecutive weeks meeting weekly goal)

  // Excludes current incomplete week from both best and current streak calculations
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

    const weeklyUniqueDays = new Map<string, Set<string>>();

    recentSessions.forEach((session) => {
      if (!session.completedAt || session.templateName === "Synthetic Workout")
        return;
      const date = new Date(session.completedAt);
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

    // For streak calculation, exclude current incomplete week
    const completedWeeks = Array.from(weeklyWorkouts.entries())
      .filter(([weekKey]) => weekKey < currentWeekKey)
      .sort((a, b) => a[0].localeCompare(b[0]));

    let bestStreak = 0;
    let tempStreak = 0;
    let prevMonday: Date | null = null;

    for (const [weekKey, count] of completedWeeks) {
      const currentMondayDate = new Date(weekKey);

      const isConsecutive =
        prevMonday === null ||
        currentMondayDate.getTime() - prevMonday.getTime() ===
          7 * 24 * 60 * 60 * 1000;

      if (count >= weeklyGoal && isConsecutive) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else if (count >= weeklyGoal) {
        tempStreak = 1;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }

      prevMonday = currentMondayDate;
    }

    // Calculate current streak from most recent completed week backwards
    // Current incomplete week is NOT counted
    const sortedWeeksDesc = [...completedWeeks].reverse();
    let currentStreak = 0;
    let lastMonday: Date | null = null;

    for (const [weekKey, count] of sortedWeeksDesc) {
      const mondayDate = new Date(weekKey);

      let isConsecutive: boolean;
      if (lastMonday === null) {
        // First iteration - check if it's the week immediately before current week
        isConsecutive =
          currentWeekMonday.getTime() - mondayDate.getTime() ===
          7 * 24 * 60 * 60 * 1000;
      } else {
        isConsecutive =
          lastMonday.getTime() - mondayDate.getTime() ===
          7 * 24 * 60 * 60 * 1000;
      }

      if (count >= weeklyGoal && isConsecutive) {
        currentStreak++;
        lastMonday = mondayDate;
      } else if (count >= weeklyGoal && lastMonday === null) {
        // Week meets goal but not consecutive to current week - still start streak
        currentStreak = 1;
        lastMonday = mondayDate;
      } else {
        break;
      }
    }

    // Best streak is the maximum of historical best and current ongoing streak
    bestStreak = Math.max(bestStreak, currentStreak);

    return { currentStreak, bestStreak };
  }, [recentSessions, weeklyGoal]);

  const { currentStreak, bestStreak } = streakData;

  const formatDate = (date: Date) => {
    const now = new Date();

    // Normalize both dates to start of day for proper comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compareDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = today.getTime() - compareDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getExercisesList = (session: any) => {
    if (!session.exerciseLogs || session.exerciseLogs.length === 0) {
      return "No exercises logged";
    }
    return session.exerciseLogs.map((log: any) => log.exerciseName).join(" · ");
  };

  // Get monthly workout counts
  const getMonthlyWorkouts = (monthsAgo: number) => {
    const now = new Date();
    const targetMonth = new Date(
      now.getFullYear(),
      now.getMonth() - monthsAgo,
      1
    );
    const nextMonth = new Date(
      now.getFullYear(),
      now.getMonth() - monthsAgo + 1,
      1
    );

    return recentSessions.filter((session) => {
      if (!session.completedAt) return false;
      if (session.templateName === "Synthetic Workout") return false;
      const sessionDate = new Date(session.completedAt);
      return sessionDate >= targetMonth && sessionDate < nextMonth;
    }).length;
  };

  // Get dynamic month names based on current date
  const getMonthName = (monthsAgo: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    return date.toLocaleDateString("en-US", { month: "long" });
  };

  const months = [
    {
      name: getMonthName(0),
      icon: Cloud,
      workouts: getMonthlyWorkouts(0),
      monthsAgo: 0,
    },
    {
      name: getMonthName(1),
      icon: Cloud,
      workouts: getMonthlyWorkouts(1),
      monthsAgo: 1,
    },
    {
      name: getMonthName(2),
      icon: Cloud,
      workouts: getMonthlyWorkouts(2),
      monthsAgo: 2,
    },
  ];

  const handleWorkoutCardPress = (session: any) => {
    setSelectedWorkoutSession(session);
    setEditedExerciseLogs(
      JSON.parse(JSON.stringify(session.exerciseLogs || []))
    );
    setIsEditingWorkout(false);
    setShowWorkoutModal(true);
  };

  const handleCloseWorkoutModal = () => {
    setShowWorkoutModal(false);
    setSelectedWorkoutSession(null);
    setIsEditingWorkout(false);
    setEditedExerciseLogs([]);
  };

  const handleDeleteWorkout = () => {
    if (!selectedWorkoutSession) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkout = async () => {
    if (!selectedWorkoutSession) return;
    try {
      await removeSession(selectedWorkoutSession.id);
      setShowDeleteModal(false);
      handleCloseWorkoutModal();
    } catch (error) {
      // Error toast is shown by the store
    }
  };

  const handleEditWorkout = () => {
    if (!selectedWorkoutSession) return;
    setIsEditingWorkout(true);
  };

  const handleSaveWorkout = async () => {
    if (!selectedWorkoutSession) return;

    try {
      // Calculate new total volume and ensure dates are proper Date objects
      let totalVolume = 0;
      const logsWithDates = editedExerciseLogs.map((log: any) => ({
        ...log,
        completedAt: log.completedAt ? new Date(log.completedAt) : null,
        sets: log.sets.map((set: any) => {
          totalVolume += (set.weight || 0) * (set.reps || 0);
          return {
            ...set,
            loggedAt: set.loggedAt ? new Date(set.loggedAt) : new Date(),
          };
        }),
      }));

      await updateSession(selectedWorkoutSession.id, {
        exerciseLogs: logsWithDates,
        totalVolume,
      });

      // Update local state
      setSelectedWorkoutSession({
        ...selectedWorkoutSession,
        exerciseLogs: logsWithDates,
        totalVolume,
      });
      setEditedExerciseLogs(logsWithDates);
      setIsEditingWorkout(false);
    } catch (error) {
      // Error toast is shown by the store
    }
  };

  const handleCancelEdit = () => {
    setEditedExerciseLogs(
      JSON.parse(JSON.stringify(selectedWorkoutSession?.exerciseLogs || []))
    );
    setIsEditingWorkout(false);
  };

  const handleUpdateSet = (
    logIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) => {
    const newLogs = [...editedExerciseLogs];
    const numValue = parseInt(value) || 0;
    newLogs[logIndex].sets[setIndex][field] = numValue;
    setEditedExerciseLogs(newLogs);
  };

  const handleDeleteSet = (logIndex: number, setIndex: number) => {
    const newLogs = [...editedExerciseLogs];
    newLogs[logIndex].sets.splice(setIndex, 1);
    // Renumber sets
    newLogs[logIndex].sets.forEach((set: any, idx: number) => {
      set.setNumber = idx + 1;
    });
    setEditedExerciseLogs(newLogs);
  };

  const handleAddSet = (logIndex: number) => {
    const newLogs = [...editedExerciseLogs];
    const sets = newLogs[logIndex].sets;

    // Get the last set's values as defaults, or use 0 if no sets exist
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : null;
    const newSetNumber = sets.length + 1;

    const newSet = {
      id: Math.random().toString(36).substring(2, 15),
      exerciseLogId: newLogs[logIndex].id,
      setNumber: newSetNumber,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      isPR: false,
      loggedAt: new Date(),
    };

    newLogs[logIndex].sets.push(newSet);
    setEditedExerciseLogs(newLogs);
  };

  const handleMonthCardPress = (monthsAgo: number) => {
    // Calculate the target month date
    const now = new Date();
    const targetMonth = new Date(
      now.getFullYear(),
      now.getMonth() - monthsAgo,
      1
    );
    // Navigate to progress tab with month parameter
    router.push({
      pathname: "/(tabs)/progress",
      params: {
        month: targetMonth.getTime().toString(), // Pass timestamp as string
        year: targetMonth.getFullYear().toString(),
        monthIndex: targetMonth.getMonth().toString(),
      },
    });
  };

  const handleDayPress = (date: Date, workouts: any[]) => {
    if (workouts.length > 0) {
      setSelectedDate(date);
      setSelectedDayWorkouts(workouts);
    }
  };

  const handleCloseDropdown = () => {
    setSelectedDate(null);
    setSelectedDayWorkouts([]);
    setExpandedWorkoutId(null);
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: themeColors.bgPrimary }]} showsVerticalScrollIndicator={false}>
        {/* Header with gradient */}
        <LinearGradient
          colors={[themeColors.gradientStart, themeColors.gradientEnd]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <WeeklyGoalRing
              current={workoutsThisWeek.length}
              total={weeklyGoal}
            />
            <TouchableOpacity
              style={styles.headerTextContainer}
              onPress={() => router.push("/(tabs)/settings")}
              activeOpacity={0.7}
            >
              <Text style={styles.headerLabel}>WEEKLY GOAL</Text>
              <Text style={styles.headerSubtext}>Tap to edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerRight}
              onPress={() => router.push("/(tabs)/progress")}
              activeOpacity={0.7}
            >
              <Text style={styles.streakLabel}>CURRENT STREAK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.streakValue}>{currentStreak} weeks</Text>
                {currentStreak >= bestStreak && currentStreak > 0 && (
                  <Flame size={16} color="#FFD700" fill="#FFD700" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* This Week Section - Always show */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.weekSection}
        >
          <WeekDayPills
            workoutsThisWeek={workoutsThisWeek}
            weeklyGoal={weeklyGoal}
            recentSessions={recentSessions}
            onDayPress={handleDayPress}
          />

          {/* Day Workouts Dropdown */}
          {selectedDate && selectedDayWorkouts.length > 0 && (
            <View style={[styles.dayDropdown, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.border }]}>
              <View style={styles.dropdownHeader}>
                <Text style={[styles.dropdownTitle, { color: themeColors.textPrimary }]}>
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <TouchableOpacity
                  onPress={handleCloseDropdown}
                  style={styles.dropdownClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownCloseText, { color: themeColors.textMuted }]}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dropdownContent}>
                {selectedDayWorkouts.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.dropdownItem, { backgroundColor: themeColors.bgTertiary }]}
                    onPress={() => {
                      handleCloseDropdown();
                      // Navigate to progress page to view completed workout details
                      router.push("/(tabs)/progress");
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={[styles.dropdownItemName, { color: themeColors.textPrimary }]}>
                        {session.templateName}
                      </Text>
                      <Text style={[styles.dropdownItemMeta, { color: themeColors.textMuted }]}>
                        {session.exerciseLogs.length}{" "}
                        {session.exerciseLogs.length === 1
                          ? "exercise"
                          : "exercises"}
                        {session.totalVolume != null &&
                          ` • ${Math.round(
                            session.totalVolume
                          ).toLocaleString()} ${preferredUnit}`}
                        {session.durationSeconds != null &&
                          ` • ${Math.floor(session.durationSeconds / 60)} min`}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={themeColors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Start Workout Button */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: themeColors.accentPrimary }]}
            onPress={() => router.push("/(tabs)/workout")}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={[styles.startButtonText, { color: "#FFFFFF" }]}>Start New Workout</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Workouts */}
        {hasRecentWorkouts && (
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>RECENT WORKOUTS</Text>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => router.push("/(tabs)/progress")}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAllText, { color: themeColors.accentPrimary }]}>See All</Text>
                <ChevronRight size={16} color={themeColors.accentPrimary} />
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsScroll}
                decelerationRate="fast"
                snapToInterval={228} // Card width (220) + gap (8)
              >
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.workoutSkeletonCard}>
                    <View style={styles.skeletonHeader}>
                      <Skeleton width={100} height={18} />
                      <Skeleton
                        width={60}
                        height={14}
                        style={{ marginTop: spacing.xs }}
                      />
                    </View>
                    <Skeleton
                      width="100%"
                      height={40}
                      style={{ marginTop: spacing.md }}
                    />
                    <View style={styles.skeletonFooter}>
                      <Skeleton width={70} height={14} />
                      <Skeleton width={70} height={14} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : recentSessions.filter(
                (session) => session.templateName !== "Synthetic Workout" && session.completedAt
              ).length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsScroll}
                decelerationRate="fast"
                snapToInterval={228} // Card width (220) + gap (8)
                snapToAlignment="start"
              >
                {recentSessions
                  .filter(
                    (session) => session.templateName !== "Synthetic Workout" && session.completedAt
                  )
                  .slice(0, 5)
                  .map((session, index) => (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.recentWorkoutCard}
                      onPress={() => handleWorkoutCardPress(session)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.recentCardHeader}>
                        <Text style={styles.recentCardTitle} numberOfLines={1}>
                          {session.templateName || "Workout"}
                        </Text>
                        <View style={styles.recentCardBadge}>
                          <Text style={styles.recentCardDate}>
                            {formatDate(new Date(session.startedAt))}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={styles.recentCardExercises}
                        numberOfLines={2}
                      >
                        {getExercisesList(session)}
                      </Text>
                      <View style={styles.recentCardStats}>
                        {session.durationSeconds != null && (
                          <View style={styles.recentCardStat}>
                            <Clock size={14} color={themeColors.textMuted} />
                            <Text style={styles.recentCardStatText}>
                              {Math.floor(session.durationSeconds / 60)} min
                            </Text>
                          </View>
                        )}
                        {session.totalVolume != null && (
                          <View style={styles.recentCardStat}>
                            <Activity size={14} color={themeColors.textMuted} />
                            <Text style={styles.recentCardStatText}>
                              {Math.round(session.totalVolume).toLocaleString()}{" "}
                              {preferredUnit}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No workouts yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start your first workout to see it here
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Monthly Progress */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleLarge}>Monthly Progress</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => router.push("/(tabs)/progress")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color={themeColors.accentPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsScroll}
            decelerationRate="fast"
            snapToAlignment="start"
          >
            {months.map((month) => (
              <MonthCard
                key={month.name}
                month={month.name}
                workouts={month.workouts}
                icon={month.icon}
                onPress={() => handleMonthCardPress(month.monthsAgo)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Workout Detail Modal - Simplified */}
      {selectedWorkoutSession && (
        <BottomSheet
          visible={showWorkoutModal}
          onClose={handleCloseWorkoutModal}
          title={selectedWorkoutSession.templateName || "Workout Details"}
        >
          <View style={styles.modalContent}>
            {/* Quick Stats Row */}
            <View style={styles.modalQuickStats}>
              {selectedWorkoutSession.completedAt && (
                <View style={styles.modalQuickStat}>
                  <Text style={styles.modalQuickStatLabel}>Date</Text>
                  <Text style={styles.modalQuickStatValue}>
                    {new Date(
                      selectedWorkoutSession.completedAt
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}
              {selectedWorkoutSession.durationSeconds != null && (
                <View style={styles.modalQuickStat}>
                  <Text style={styles.modalQuickStatLabel}>Duration</Text>
                  <Text style={styles.modalQuickStatValue}>
                    {Math.floor(selectedWorkoutSession.durationSeconds / 60)}{" "}
                    min
                  </Text>
                </View>
              )}
              {selectedWorkoutSession.totalVolume != null && (
                <View style={styles.modalQuickStat}>
                  <Text style={styles.modalQuickStatLabel}>Volume</Text>
                  <Text style={styles.modalQuickStatValue}>
                    {isEditingWorkout
                      ? Math.round(
                          editedExerciseLogs.reduce(
                            (total: number, log: any) => {
                              return (
                                total +
                                log.sets.reduce(
                                  (setTotal: number, set: any) => {
                                    return (
                                      setTotal +
                                      (set.weight || 0) * (set.reps || 0)
                                    );
                                  },
                                  0
                                )
                              );
                            },
                            0
                          )
                        ).toLocaleString()
                      : Math.round(
                          selectedWorkoutSession.totalVolume
                        ).toLocaleString()}{" "}
                    {preferredUnit}
                  </Text>
                </View>
              )}
            </View>

            {/* Exercises List - Compact View with Scroll */}
            {!isEditingWorkout &&
              selectedWorkoutSession.exerciseLogs &&
              selectedWorkoutSession.exerciseLogs.length > 0 && (
                <View style={styles.modalExercisesList}>
                  {selectedWorkoutSession.exerciseLogs.map((log: any) => (
                    <View key={log.id} style={styles.modalExerciseItem}>
                      <View style={styles.modalExerciseHeader}>
                        <Dumbbell size={16} color={themeColors.accentPrimary} />
                        <Text style={styles.modalExerciseName}>
                          {log.exerciseName || "Unknown Exercise"}
                        </Text>
                      </View>
                      {log.sets && log.sets.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.modalSetsScrollContent}
                        >
                          {log.sets.map((set: any, index: number) => (
                            <View
                              key={set.id || index}
                              style={styles.modalSetBadge}
                            >
                              <Text style={styles.modalSetText}>
                                {set.weight}×{set.reps}
                                {set.isPR && " 🏆"}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ))}
                </View>
              )}

            {/* Exercises - Edit Mode */}
            {isEditingWorkout && editedExerciseLogs.length > 0 && (
              <ScrollView style={styles.editScrollView} nestedScrollEnabled>
                {editedExerciseLogs.map((log: any, logIndex: number) => (
                  <View key={log.id} style={styles.modalExerciseItem}>
                    <Text style={styles.editExerciseName}>
                      {log.exerciseName || "Unknown Exercise"}
                    </Text>
                    {log.sets && log.sets.length > 0 && (
                      <View style={styles.editSetsContainer}>
                        {log.sets.map((set: any, setIndex: number) => (
                          <View
                            key={set.id || setIndex}
                            style={styles.editSetRow}
                          >
                            <Text style={styles.editSetLabel}>
                              Set {set.setNumber || setIndex + 1}
                            </Text>
                            <TextInput
                              style={styles.editSetInput}
                              value={String(set.weight || "")}
                              onChangeText={(value) =>
                                handleUpdateSet(
                                  logIndex,
                                  setIndex,
                                  "weight",
                                  value
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={themeColors.textMuted}
                            />
                            <Text style={styles.editSetUnit}>
                              {preferredUnit} ×
                            </Text>
                            <TextInput
                              style={styles.editSetInput}
                              value={String(set.reps || "")}
                              onChangeText={(value) =>
                                handleUpdateSet(
                                  logIndex,
                                  setIndex,
                                  "reps",
                                  value
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={themeColors.textMuted}
                            />
                            <TouchableOpacity
                              style={styles.deleteSetButton}
                              onPress={() =>
                                handleDeleteSet(logIndex, setIndex)
                              }
                              activeOpacity={0.7}
                            >
                              <X size={16} color={themeColors.accentDanger} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.addSetButton}
                      onPress={() => handleAddSet(logIndex)}
                      activeOpacity={0.7}
                    >
                      <Plus size={16} color={themeColors.accentPrimary} />
                      <Text style={styles.addSetButtonText}>Add Set</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Action Buttons - Simplified */}
            <View style={styles.modalActions}>
              {!isEditingWorkout ? (
                <>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={handleEditWorkout}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={18} color={themeColors.textPrimary} />
                    <Text style={styles.modalActionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalDeleteBtn]}
                    onPress={handleDeleteWorkout}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color={themeColors.accentDanger} />
                    <Text style={styles.modalDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={handleCancelEdit}
                    activeOpacity={0.7}
                  >
                    <X size={18} color={themeColors.textSecondary} />
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalSaveBtn]}
                    onPress={handleSaveWorkout}
                    activeOpacity={0.7}
                  >
                    <Save size={18} color={themeColors.textPrimary} />
                    <Text style={styles.modalSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </BottomSheet>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteWorkout}
        title="Delete Workout"
        message={`Are you sure you want to delete "${
          selectedWorkoutSession?.templateName || "this workout"
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
      />
    </>
  );
}

// Dynamic styles creator function
const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  headerSubtext: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 2,
  },
  weekSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentPrimary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: 18,
    borderRadius: borderRadius.xl,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  sectionTitleLarge: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    color: colors.accentPrimary,
    marginRight: 2,
  },
  cardsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  // Skeleton loading styles
  workoutSkeletonCard: {
    width: 200,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  skeletonHeader: {
    marginBottom: spacing.sm,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  // Improved Recent Workout Cards
  recentWorkoutCard: {
    width: 220,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  recentCardTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  recentCardBadge: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  recentCardDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  recentCardExercises: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  recentCardStats: {
    flexDirection: "row",
    gap: spacing.md,
  },
  recentCardStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  recentCardStatText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  bottomPadding: {
    height: 100,
  },
  dayDropdown: {
    marginTop: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dropdownClose: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownCloseText: {
    fontSize: 20,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dropdownContent: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  dropdownItemMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dropdownItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownExpandedContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgTertiary,
  },
  dropdownExerciseItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownExerciseName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  dropdownExerciseSets: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // Simplified Modal Styles - Consistent with BottomSheet theme
  modalContent: {
    paddingBottom: spacing.md,
  },
  modalQuickStats: {
    flexDirection: "row",
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalQuickStat: {
    flex: 1,
    alignItems: "center",
  },
  modalQuickStatLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  modalQuickStatValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  modalExercisesList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalExerciseItem: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalExerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalExerciseName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  modalSetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  modalSetsScrollContent: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  modalSetBadge: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSetText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActionBtnText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  modalDeleteBtn: {
    backgroundColor: colors.accentDanger + "15",
    borderColor: colors.accentDanger + "30",
  },
  modalDeleteBtnText: {
    ...typography.body,
    color: colors.accentDanger,
    fontWeight: "700",
  },
  modalSaveBtn: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  modalSaveBtnText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  modalCancelBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  editScrollView: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  editExerciseName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  editSetsContainer: {
    gap: spacing.xs,
  },
  workoutModalContent: {
    paddingVertical: spacing.sm,
  },
  workoutModalSection: {
    marginBottom: spacing.lg,
  },
  workoutModalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  workoutModalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  workoutModalSubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
  workoutModalStats: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  workoutModalStatItem: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  workoutModalStatLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs / 2,
  },
  workoutModalStatValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  workoutModalExercise: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  workoutModalExerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  workoutModalSets: {
    gap: spacing.xs,
  },
  workoutModalSet: {
    paddingLeft: spacing.md,
  },
  workoutModalSetText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  workoutModalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  workoutModalEditButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  workoutModalEditButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  workoutModalDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  workoutModalDeleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentDanger,
  },
  workoutModalScrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  workoutModalScrollContent: {
    paddingBottom: spacing.xl,
  },
  workoutModalCancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  workoutModalCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  workoutModalSaveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentPrimary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  workoutModalSaveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  editSetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  editSetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 50,
  },
  editSetInput: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.textPrimary,
    width: 55,
    textAlign: "center",
  },
  editSetUnit: {
    fontSize: 14,
    color: colors.textMuted,
  },
  deleteSetButton: {
    padding: spacing.xs,
    marginLeft: "auto",
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    borderStyle: "dashed",
    gap: spacing.xs,
  },
  addSetButtonText: {
    fontSize: 14,
    color: colors.accentPrimary,
    fontWeight: "500",
  },
});
