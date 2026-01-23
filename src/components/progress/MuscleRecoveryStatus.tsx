import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react-native";
import {
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";
import { categoryLabels } from "../../constants/exercises";
import type { ExerciseCategory, WorkoutSession } from "../../types";

interface MuscleRecoveryStatusProps {
  sessions: WorkoutSession[];
  exercises: Array<{ name: string; category: ExerciseCategory }>;
  getExerciseCategory: (name: string, exercises: any[]) => ExerciseCategory;
}

// Recommended recovery days per muscle group
const recoveryGuide: Record<ExerciseCategory, number> = {
  chest: 2,
  back: 2,
  shoulders: 2,
  biceps: 2,
  triceps: 2,
  quads: 2,
  hamstrings: 2,
  glutes: 2,
  calves: 1,
  core: 1,
  full_body: 3,
};


export function MuscleRecoveryStatus({
  sessions,
  exercises,
  getExerciseCategory,
}: MuscleRecoveryStatusProps) {
  const colors = useColors();
  
  // Category colors - dynamically get theme colors
  const categoryColors: Record<string, string> = {
    chest: colors.accentPrimary,
    back: colors.accentSecondary,
    shoulders: colors.accentInfo,
    biceps: "#FF6B6B",
    triceps: "#4ECDC4",
    quads: "#95E1D3",
    hamstrings: "#F38181",
    glutes: "#AA96DA",
    calves: "#FCBAD3",
    core: "#FFD93D",
    full_body: colors.textSecondary,
  };

  const muscleLastTrained = useMemo(() => {
    const lastTrainedMap = new Map<ExerciseCategory, Date>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort sessions by completion date descending
    const sortedSessions = [...sessions]
      .filter((s) => s.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      );

    // Go through sessions and track last trained date for each muscle
    sortedSessions.forEach((session) => {
      if (!session.exerciseLogs) return;
      const sessionDate = new Date(session.completedAt!);
      sessionDate.setHours(0, 0, 0, 0);

      session.exerciseLogs.forEach((log) => {
        if (!log.sets || log.sets.length === 0) return;
        const category = getExerciseCategory(log.exerciseName || "", exercises);

        // Only update if we haven't found a more recent training
        if (!lastTrainedMap.has(category)) {
          lastTrainedMap.set(category, sessionDate);
        }
      });
    });

    // Calculate days since last trained for each muscle
    const results: {
      category: ExerciseCategory;
      label: string;
      daysSince: number | null;
      status: "recovered" | "recovering" | "overdue" | "never";
      color: string;
    }[] = [];

    const allCategories: ExerciseCategory[] = [
      "chest",
      "back",
      "shoulders",
      "biceps",
      "triceps",
      "quads",
      "hamstrings",
      "glutes",
      "calves",
      "core",
    ];

    allCategories.forEach((category) => {
      const lastTrained = lastTrainedMap.get(category);
      let daysSince: number | null = null;
      let status: "recovered" | "recovering" | "overdue" | "never" = "never";

      if (lastTrained) {
        daysSince = Math.floor(
          (today.getTime() - lastTrained.getTime()) / (1000 * 60 * 60 * 24)
        );
        const recommendedRecovery = recoveryGuide[category];

        if (daysSince < recommendedRecovery) {
          status = "recovering";
        } else if (daysSince <= recommendedRecovery + 4) {
          status = "recovered";
        } else {
          status = "overdue";
        }
      }

      results.push({
        category,
        label: categoryLabels[category],
        daysSince,
        status,
        color: categoryColors[category] || colors.accentPrimary,
      });
    });

    // Sort by days since (null/never at end, then overdue, then recovered, then recovering)
    return results.sort((a, b) => {
      if (a.daysSince === null && b.daysSince === null) return 0;
      if (a.daysSince === null) return 1;
      if (b.daysSince === null) return -1;
      return b.daysSince - a.daysSince; // Most overdue first
    });
  }, [sessions, exercises, getExerciseCategory]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "recovering":
        return <Clock size={14} color={colors.accentWarning} />;
      case "recovered":
        return <CheckCircle2 size={14} color={colors.accentSecondary} />;
      case "overdue":
        return <AlertCircle size={14} color={colors.accentDanger} />;
      default:
        return <Clock size={14} color={colors.textMuted} />;
    }
  };

  const getStatusText = (
    status: string,
    daysSince: number | null,
    category: ExerciseCategory
  ) => {
    if (daysSince === null) return "Never trained";
    if (daysSince === 0) return "Trained today";
    if (daysSince === 1) return "1 day ago";
    return `${daysSince} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recovering":
        return colors.accentWarning;
      case "recovered":
        return colors.accentSecondary;
      case "overdue":
        return colors.accentDanger;
      default:
        return colors.textMuted;
    }
  };

  // Calculate recovery progress bar
  const getRecoveryProgress = (
    daysSince: number | null,
    category: ExerciseCategory
  ) => {
    if (daysSince === null) return 0;
    const recommended = recoveryGuide[category];
    return Math.min(daysSince / recommended, 1) * 100;
  };

  return (
    <View style={styles.container}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <Clock size={12} color={colors.accentWarning} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Recovering</Text>
        </View>
        <View style={styles.legendItem}>
          <CheckCircle2 size={12} color={colors.accentSecondary} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Ready</Text>
        </View>
        <View style={styles.legendItem}>
          <AlertCircle size={12} color={colors.accentDanger} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Overdue</Text>
        </View>
      </View>

      <View style={styles.muscleList}>
        {muscleLastTrained.map((muscle) => (
          <View key={muscle.category} style={[styles.muscleRow, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.muscleInfo}>
              <View style={styles.muscleHeader}>
                <View
                  style={[styles.colorDot, { backgroundColor: muscle.color }]}
                />
                <Text style={[styles.muscleName, { color: colors.textPrimary }]}>{muscle.label}</Text>
              </View>
              <View style={styles.statusRow}>
                {getStatusIcon(muscle.status)}
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(muscle.status) },
                  ]}
                >
                  {getStatusText(
                    muscle.status,
                    muscle.daysSince,
                    muscle.category
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: colors.bgTertiary }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getRecoveryProgress(
                        muscle.daysSince,
                        muscle.category
                      )}%`,
                      backgroundColor: getStatusColor(muscle.status),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendText: {
    ...typography.caption,
  },
  muscleList: {
    gap: spacing.sm,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  muscleInfo: {
    flex: 1,
  },
  muscleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  muscleName: {
    ...typography.body,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.lg + spacing.xs,
  },
  statusText: {
    ...typography.caption,
  },
  progressContainer: {
    width: 60,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
