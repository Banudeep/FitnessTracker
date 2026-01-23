import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Trophy,
  Clock,
  Dumbbell,
  TrendingUp,
  Flame,
} from "lucide-react-native";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { useSettingsStore } from "../../src/stores/settingsStore";
import { Button, Card } from "../../src/components/ui";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const colors = useColors();
  const recentSessions = useWorkoutStore((state) => state.recentSessions);
  const weeklyGoal = useSettingsStore((state) => state.weeklyGoal);
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const insets = useSafeAreaInsets();

  // Get the most recent session (the one we just completed)
  const completedSession = recentSessions[0];

  // Calculate workouts this week (Monday-based week)
  const getWorkoutsThisWeek = () => {
    const now = new Date();
    const todayDay = now.getDay();
    const startOfWeek = new Date(now);
    // Get Monday of current week (0 = Sunday, 1 = Monday, etc.)
    startOfWeek.setDate(now.getDate() - (todayDay === 0 ? 6 : todayDay - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    // Get unique days (not total workouts)
    const uniqueDays = new Set<string>();

    recentSessions
      .filter((session) => {
        if (session.templateName === "Synthetic Workout") return false;
        if (!session.completedAt) return false;

        const sessionDate = new Date(session.completedAt);
        return sessionDate >= startOfWeek;
      })
      .forEach((session) => {
        if (!session.completedAt) return;
        
        const sessionDate = new Date(session.completedAt);
        const date = new Date(sessionDate);
        date.setHours(0, 0, 0, 0);
        uniqueDays.add(date.toDateString());
      });

    return uniqueDays.size;
  };

  const workoutsThisWeek = getWorkoutsThisWeek();
  const remainingForGoal = Math.max(0, weeklyGoal - workoutsThisWeek);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}h ${remainingMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleDone = () => {
    router.replace("/");
  };

  if (!completedSession) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No workout data found</Text>
        <Button
          title="Go Home"
          onPress={handleDone}
          style={styles.errorButton}
        />
      </View>
    );
  }

  // Find PRs in this workout
  const newPRs = completedSession.exerciseLogs.flatMap((log) =>
    log.sets
      .filter((set) => set.isPR)
      .map((set) => ({
        exerciseName: log.exerciseName,
        weight: set.weight,
        reps: set.reps,
      }))
  );

  const totalSets = completedSession.exerciseLogs.reduce(
    (sum, log) => sum + log.sets.length,
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Celebration Header */}
          <View style={styles.header}>
            <View style={[styles.celebrationIcon, { backgroundColor: colors.accentPrimary + "20" }]}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Workout Complete!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{completedSession.templateName}</Text>
          </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Clock size={24} color={colors.accentInfo} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {completedSession.durationSeconds
                ? formatDuration(completedSession.durationSeconds)
                : "--"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
          </Card>

          <Card style={styles.statCard}>
            <TrendingUp size={24} color={colors.accentPrimary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {completedSession.totalVolume
                ? `${Math.round(completedSession.totalVolume).toLocaleString()}`
                : "--"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Volume ({preferredUnit})</Text>
          </Card>

          <Card style={styles.statCard}>
            <Dumbbell size={24} color={colors.accentWarning} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {completedSession.exerciseLogs.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>💪</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalSets}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
          </Card>
        </View>

        {/* New PRs */}
        {newPRs.length > 0 && (
          <Card style={styles.prCard}>
            <View style={styles.prHeader}>
              <Trophy size={24} color={colors.prGold} />
              <Text style={styles.prTitle}>New Personal Records!</Text>
            </View>
            {newPRs.map((pr, index) => (
              <View key={index} style={styles.prItem}>
                <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                <Text style={styles.prValue}>
                  {pr.weight} {preferredUnit} × {pr.reps}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Week Progress */}
        <Card style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Flame size={24} color={colors.streakFire} />
            <View style={styles.streakInfo}>
              <Text style={[styles.streakTitle, { color: colors.textSecondary }]}>Week Progress</Text>
              <Text style={[styles.streakValue, { color: colors.textPrimary }]}>
                {workoutsThisWeek}/{weeklyGoal} workouts
              </Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.bgTertiary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    (workoutsThisWeek / weeklyGoal) * 100
                  )}%`,
                },
              ]}
            />
          </View>
          {remainingForGoal > 0 ? (
            <Text style={[styles.streakMessage, { color: colors.textSecondary }]}>
              {remainingForGoal} more{" "}
              {remainingForGoal === 1 ? "workout" : "workouts"} to hit your
              goal!
            </Text>
          ) : (
            <Text style={[styles.streakMessage, styles.goalMet, { color: colors.accentPrimary }]}>
              🎯 You've hit your weekly goal!
            </Text>
          )}
        </Card>

        {/* Exercise Summary */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Workout Summary</Text>
          {completedSession.exerciseLogs.map((log) => (
            <View key={log.id} style={[styles.summaryExercise, { borderBottomColor: colors.border }]}>
              <Text style={[styles.summaryExerciseName, { color: colors.textPrimary }]}>{log.exerciseName}</Text>
              <View style={styles.summarySets}>
                {log.sets.map((set, index) => (
                  <Text key={set.id} style={[styles.summarySet, { color: colors.textSecondary, backgroundColor: colors.bgTertiary }]}>
                    {set.weight} × {set.reps}
                    {set.isPR && " 🏆"}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Done Button */}
      <View style={[styles.footer, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
        <Button title="Done" onPress={handleDone} size="lg" fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: "center",
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: defaultColors.accentPrimary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  celebrationEmoji: {
    fontSize: 40,
  },
  title: {
    ...typography.heading1,
    color: defaultColors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: defaultColors.textSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.heading2,
    color: defaultColors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  prCard: {
    marginBottom: spacing.lg,
    backgroundColor: defaultColors.prGold + "10",
    borderWidth: 1,
    borderColor: defaultColors.prGold + "30",
  },
  prHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  prTitle: {
    ...typography.heading3,
    color: defaultColors.prGold,
  },
  prItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: defaultColors.prGold + "20",
  },
  prExercise: {
    ...typography.body,
    color: defaultColors.textPrimary,
  },
  prValue: {
    ...typography.body,
    color: defaultColors.prGold,
    fontWeight: "600",
  },
  streakCard: {
    marginBottom: spacing.lg,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
  },
  streakValue: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
  },
  progressBar: {
    height: 8,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: defaultColors.accentPrimary,
    borderRadius: 4,
  },
  streakMessage: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
  },
  goalMet: {
    color: defaultColors.accentPrimary,
    fontWeight: "600",
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryExercise: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  summaryExerciseName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  summarySets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summarySet: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    backgroundColor: defaultColors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  bottomPadding: {
    height: 120,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: defaultColors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
  },
  errorText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
  errorButton: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
});
