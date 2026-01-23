import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";
import { categoryLabels } from "../../constants/exercises";
import type { ExerciseCategory, WorkoutSession } from "../../types";

interface TrainingBalanceChartProps {
  sessions: WorkoutSession[];
  exercises: Array<{ name: string; category: ExerciseCategory }>;
  getExerciseCategory: (name: string, exercises: any[]) => ExerciseCategory;
  timeRange?: "week" | "month" | "all"; // How far back to look
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_SIZE = Math.min(SCREEN_WIDTH - 80, 280);
const CENTER = CHART_SIZE / 2;
const MAX_RADIUS = CHART_SIZE / 2 - 40;

// Primary muscle groups for the radar (excluding full_body for cleaner chart)
const primaryMuscleGroups: ExerciseCategory[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "core",
];

// Abbreviated labels for chart
const shortLabels: Record<ExerciseCategory, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shldrs",
  biceps: "Biceps",
  triceps: "Tri",
  quads: "Quads",
  hamstrings: "Hams",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  full_body: "Full",
};

export function TrainingBalanceChart({
  sessions,
  exercises,
  getExerciseCategory,
  timeRange = "month",
}: TrainingBalanceChartProps) {
  const colors = useColors();

  // Category colors matching other charts
  const categoryColors = useMemo(() => ({
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
  }), [colors]);
  // Calculate volume per muscle group
  const muscleVolumes = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    if (timeRange === "week") {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timeRange === "month") {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 10); // Effectively "all"
    }

    const volumeMap = new Map<ExerciseCategory, number>();

    // Initialize all groups with 0
    primaryMuscleGroups.forEach((group) => volumeMap.set(group, 0));

    sessions.forEach((session) => {
      if (!session.completedAt) return;
      const sessionDate = new Date(session.completedAt);
      if (sessionDate < cutoffDate) return;
      if (!session.exerciseLogs) return;

      session.exerciseLogs.forEach((log) => {
        if (!log.sets || log.sets.length === 0) return;
        const category = getExerciseCategory(log.exerciseName || "", exercises);

        // Skip full_body for this chart
        if (category === "full_body") return;
        if (!primaryMuscleGroups.includes(category)) return;

        log.sets.forEach((set) => {
          const volume = (set.weight || 0) * (set.reps || 0);
          volumeMap.set(category, (volumeMap.get(category) || 0) + volume);
        });
      });
    });

    // Normalize to percentages of max
    const maxVolume = Math.max(...Array.from(volumeMap.values()), 1);

    return primaryMuscleGroups.map((category, index) => {
      const volume = volumeMap.get(category) || 0;
      const percentage = volume / maxVolume; // 0-1 range
      const angle =
        (index * 2 * Math.PI) / primaryMuscleGroups.length - Math.PI / 2;

      return {
        category,
        label: shortLabels[category],
        fullLabel: categoryLabels[category],
        volume,
        percentage,
        angle,
        color: categoryColors[category],
      };
    });
  }, [sessions, exercises, getExerciseCategory, timeRange]);

  // Calculate total volume for display
  const totalVolume = useMemo(() => {
    return muscleVolumes.reduce((sum, m) => sum + m.volume, 0);
  }, [muscleVolumes]);

  // Calculate polygon points for the filled area
  const polygonPoints = useMemo(() => {
    return muscleVolumes
      .map((muscle) => {
        const radius = muscle.percentage * MAX_RADIUS;
        const x = CENTER + radius * Math.cos(muscle.angle);
        const y = CENTER + radius * Math.sin(muscle.angle);
        return `${x},${y}`;
      })
      .join(" ");
  }, [muscleVolumes]);

  // Generate radar grid lines (concentric circles at 25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Calculate balance score (how evenly distributed the training is)
  const balanceScore = useMemo(() => {
    const percentages = muscleVolumes.map((m) => m.percentage);
    const nonZero = percentages.filter((p) => p > 0);
    if (nonZero.length === 0) return 0;

    // Calculate coefficient of variation (lower = more balanced)
    const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
    const variance =
      nonZero.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      nonZero.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Convert to 0-100 score (lower CV = higher score)
    return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  }, [muscleVolumes]);

  // Identify weak areas (muscles with less than 30% of max)
  const weakAreas = useMemo(() => {
    return muscleVolumes
      .filter((m) => m.percentage < 0.3 && m.percentage > 0)
      .map((m) => m.fullLabel);
  }, [muscleVolumes]);

  const neglectedAreas = useMemo(() => {
    return muscleVolumes
      .filter((m) => m.percentage === 0)
      .map((m) => m.fullLabel);
  }, [muscleVolumes]);

  if (totalVolume === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Complete workouts to see your training balance
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Score */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Balance Score</Text>
        <View style={styles.scoreRow}>
          <Text
            style={[
              styles.scoreValue,
              {
                color:
                  balanceScore >= 70
                    ? colors.accentSecondary
                    : balanceScore >= 40
                    ? colors.accentWarning
                    : colors.accentDanger,
              },
            ]}
          >
            {balanceScore}%
          </Text>
          <Text style={[styles.scoreHint, { color: colors.textSecondary }]}>
            {balanceScore >= 70
              ? "Well balanced!"
              : balanceScore >= 40
              ? "Room for improvement"
              : "Consider diversifying"}
          </Text>
        </View>
      </View>

      {/* Radar Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          {/* Grid circles */}
          {gridLevels.map((level, i) => (
            <Circle
              key={`grid-${i}`}
              cx={CENTER}
              cy={CENTER}
              r={MAX_RADIUS * level}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray={level === 1 ? "0" : "4,4"}
              opacity={0.5}
            />
          ))}

          {/* Axis lines and labels */}
          {muscleVolumes.map((muscle, i) => {
            const endX = CENTER + MAX_RADIUS * Math.cos(muscle.angle);
            const endY = CENTER + MAX_RADIUS * Math.sin(muscle.angle);
            const labelX = CENTER + (MAX_RADIUS + 25) * Math.cos(muscle.angle);
            const labelY = CENTER + (MAX_RADIUS + 25) * Math.sin(muscle.angle);

            return (
              <React.Fragment key={muscle.category}>
                <Line
                  x1={CENTER}
                  y1={CENTER}
                  x2={endX}
                  y2={endY}
                  stroke={colors.border}
                  strokeWidth={1}
                  opacity={0.5}
                />
                <SvgText
                  x={labelX}
                  y={labelY + 4}
                  fill={
                    muscle.percentage > 0
                      ? colors.textSecondary
                      : colors.textMuted
                  }
                  fontSize={10}
                  fontWeight={muscle.percentage > 0.5 ? "600" : "400"}
                  textAnchor="middle"
                >
                  {muscle.label}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Filled polygon */}
          <Polygon
            points={polygonPoints}
            fill={colors.accentPrimary + "30"}
            stroke={colors.accentPrimary}
            strokeWidth={2}
          />

          {/* Data points */}
          {muscleVolumes.map((muscle) => {
            const radius = muscle.percentage * MAX_RADIUS;
            const x = CENTER + radius * Math.cos(muscle.angle);
            const y = CENTER + radius * Math.sin(muscle.angle);

            if (muscle.percentage === 0) return null;

            return (
              <Circle
                key={`point-${muscle.category}`}
                cx={x}
                cy={y}
                r={5}
                fill={muscle.color}
                stroke={colors.bgPrimary}
                strokeWidth={2}
              />
            );
          })}
        </Svg>
      </View>

      {/* Insights */}
      <View style={styles.insightsContainer}>
        {weakAreas.length > 0 && (
          <View style={styles.insightRow}>
            <View
              style={[
                styles.insightDot,
                { backgroundColor: colors.accentWarning },
              ]}
            />
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              <Text style={[styles.insightLabel, { color: colors.textPrimary }]}>Undertrained: </Text>
              {weakAreas.join(", ")}
            </Text>
          </View>
        )}
        {neglectedAreas.length > 0 && (
          <View style={styles.insightRow}>
            <View
              style={[
                styles.insightDot,
                { backgroundColor: colors.accentDanger },
              ]}
            />
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              <Text style={[styles.insightLabel, { color: colors.textPrimary }]}>Not trained: </Text>
              {neglectedAreas.join(", ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.lg,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  scoreLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  scoreHint: {
    ...typography.caption,
    color: defaultColors.textSecondary,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  insightsContainer: {
    width: "100%",
    gap: spacing.sm,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  insightText: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    flex: 1,
  },
  insightLabel: {
    fontWeight: "600",
    color: defaultColors.textPrimary,
  },
});
