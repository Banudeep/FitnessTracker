import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";
import { categoryLabels } from "../../constants/exercises";
import type { ExerciseCategory, WorkoutSession } from "../../types";

interface VolumeTrendsChartProps {
  sessions: WorkoutSession[];
  exercises: Array<{ name: string; category: ExerciseCategory }>;
  getExerciseCategory: (name: string, exercises: any[]) => ExerciseCategory;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 150;
const BAR_SPACING = 8;

const muscleGroups: ExerciseCategory[] = [
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

export function VolumeTrendsChart({
  sessions,
  exercises,
  getExerciseCategory,
}: VolumeTrendsChartProps) {
  const colors = useColors();
  const [selectedMuscle, setSelectedMuscle] =
    useState<ExerciseCategory>("chest");

  // Category colors
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

  // Calculate weekly volume for each muscle group over the past 8 weeks
  const volumeData = useMemo(() => {
    const now = new Date();
    const weeksToShow = 8;

    // Create week buckets
    const weekBuckets: { start: Date; end: Date; label: string }[] = [];
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      weekBuckets.push({
        start: weekStart,
        end: weekEnd,
        label: `W${weeksToShow - i}`,
      });
    }

    // Calculate volume per muscle group per week
    const muscleWeeklyVolumes: Record<ExerciseCategory, number[]> =
      {} as Record<ExerciseCategory, number[]>;

    muscleGroups.forEach((group) => {
      muscleWeeklyVolumes[group] = new Array(weeksToShow).fill(0);
    });

    sessions.forEach((session) => {
      if (!session.completedAt || !session.exerciseLogs) return;
      const sessionDate = new Date(session.completedAt);

      // Find which week bucket this session belongs to
      const weekIndex = weekBuckets.findIndex(
        (week) => sessionDate >= week.start && sessionDate <= week.end
      );
      if (weekIndex === -1) return;

      session.exerciseLogs.forEach((log) => {
        if (!log.sets || log.sets.length === 0) return;
        const category = getExerciseCategory(log.exerciseName || "", exercises);
        if (!muscleGroups.includes(category)) return;

        log.sets.forEach((set) => {
          const volume = (set.weight || 0) * (set.reps || 0);
          muscleWeeklyVolumes[category][weekIndex] += volume;
        });
      });
    });

    return {
      weekLabels: weekBuckets.map((w) => w.label),
      muscleVolumes: muscleWeeklyVolumes,
    };
  }, [sessions, exercises, getExerciseCategory]);

  // Calculate trend for selected muscle
  const trendInfo = useMemo(() => {
    const volumes = volumeData.muscleVolumes[selectedMuscle];
    const nonZeroVolumes = volumes.filter((v) => v > 0);

    if (nonZeroVolumes.length < 2) {
      return {
        trend: "neutral" as const,
        percentage: 0,
        description: "Not enough data",
      };
    }

    // Compare last 2 weeks with first 2 weeks (or what's available)
    const recentAvg =
      (volumes[volumes.length - 1] + volumes[volumes.length - 2]) / 2;
    const earlierAvg = (volumes[0] + volumes[1]) / 2;

    if (earlierAvg === 0) {
      if (recentAvg > 0) {
        return {
          trend: "up" as const,
          percentage: 100,
          description: "Started training!",
        };
      }
      return {
        trend: "neutral" as const,
        percentage: 0,
        description: "No recent activity",
      };
    }

    const percentChange = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (percentChange > 10) {
      return {
        trend: "up" as const,
        percentage: Math.round(percentChange),
        description: "Volume increasing",
      };
    } else if (percentChange < -10) {
      return {
        trend: "down" as const,
        percentage: Math.round(Math.abs(percentChange)),
        description: "Volume decreasing",
      };
    } else {
      return {
        trend: "neutral" as const,
        percentage: Math.round(Math.abs(percentChange)),
        description: "Maintaining",
      };
    }
  }, [volumeData, selectedMuscle]);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  // Get total volume for selected muscle
  const totalVolume = volumeData.muscleVolumes[selectedMuscle].reduce(
    (sum, v) => sum + v,
    0
  );

  return (
    <View style={styles.container}>
      {/* Muscle Group Selector */}
      <View style={styles.muscleSelector}>
        {muscleGroups.map((muscle) => (
          <TouchableOpacity
            key={muscle}
            style={[
              styles.muscleTab,
              selectedMuscle === muscle && styles.muscleTabActive,
              selectedMuscle === muscle && {
                borderBottomColor: categoryColors[muscle],
                backgroundColor: colors.bgSecondary,
              },
              { backgroundColor: colors.bgTertiary }
            ]}
            onPress={() => setSelectedMuscle(muscle)}
          >
            <View
              style={[
                styles.muscleDot,
                { backgroundColor: categoryColors[muscle] },
                selectedMuscle === muscle && styles.muscleDotActive,
              ]}
            />
            <Text
              style={[
                styles.muscleTabText,
                { color: colors.textMuted },
                selectedMuscle === muscle && { color: colors.textPrimary, fontWeight: "600" },
              ]}
              numberOfLines={1}
            >
              {categoryLabels[muscle].slice(0, 5)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trend Summary */}
      <View style={[styles.trendContainer, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.trendHeader}>
          <Text style={[styles.muscleName, { color: colors.textPrimary }]}>
            {categoryLabels[selectedMuscle]}
          </Text>
          <View style={styles.trendBadge}>
            {trendInfo.trend === "up" && (
              <TrendingUp size={16} color={colors.accentSecondary} />
            )}
            {trendInfo.trend === "down" && (
              <TrendingDown size={16} color={colors.accentDanger} />
            )}
            {trendInfo.trend === "neutral" && (
              <Minus size={16} color={colors.accentWarning} />
            )}
            <Text
              style={[
                styles.trendText,
                {
                  color:
                    trendInfo.trend === "up"
                      ? colors.accentSecondary
                      : trendInfo.trend === "down"
                      ? colors.accentDanger
                      : colors.accentWarning,
                },
              ]}
            >
              {trendInfo.percentage > 0 && `${trendInfo.percentage}% `}
              {trendInfo.description}
            </Text>
          </View>
        </View>
        <Text style={[styles.totalVolume, { color: colors.textSecondary }]}>
          Total: {formatVolume(totalVolume)} lbs (8 weeks)
        </Text>
      </View>

      {/* SVG Bar Chart */}
      {totalVolume > 0 ? (
        <View style={styles.chartWrapper}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 30}>
            <Defs>
              <LinearGradient
                id={`gradient-${selectedMuscle}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop
                  offset="0%"
                  stopColor={categoryColors[selectedMuscle]}
                  stopOpacity={1}
                />
                <Stop
                  offset="100%"
                  stopColor={categoryColors[selectedMuscle]}
                  stopOpacity={0.5}
                />
              </LinearGradient>
            </Defs>

            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <Line
                key={`grid-${i}`}
                x1={35}
                y1={CHART_HEIGHT * (1 - ratio)}
                x2={CHART_WIDTH}
                y2={CHART_HEIGHT * (1 - ratio)}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.3}
              />
            ))}

            {/* Bars */}
            {(() => {
              const data = volumeData.muscleVolumes[selectedMuscle];
              const maxValue = Math.max(...data, 1);
              const barWidth =
                (CHART_WIDTH - (data.length - 1) * BAR_SPACING - 50) /
                data.length;

              return data.map((value, index) => {
                const barHeight = Math.max(
                  4,
                  (value / maxValue) * (CHART_HEIGHT - 10)
                );
                const x = 45 + index * (barWidth + BAR_SPACING);
                const y = CHART_HEIGHT - barHeight;

                return (
                  <React.Fragment key={`bar-${index}`}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={`url(#gradient-${selectedMuscle})`}
                      rx={4}
                      ry={4}
                    />
                    <SvgText
                      x={x + barWidth / 2}
                      y={CHART_HEIGHT + 15}
                      fill={colors.textMuted}
                      fontSize={10}
                      textAnchor="middle"
                    >
                      {volumeData.weekLabels[index]}
                    </SvgText>
                  </React.Fragment>
                );
              });
            })()}

            {/* Y-axis labels */}
            <SvgText x={0} y={15} fill={colors.textMuted} fontSize={9}>
              {formatVolume(
                Math.max(...volumeData.muscleVolumes[selectedMuscle], 1)
              )}
            </SvgText>
            <SvgText
              x={0}
              y={CHART_HEIGHT - 5}
              fill={colors.textMuted}
              fontSize={9}
            >
              0
            </SvgText>
          </Svg>
        </View>
      ) : (
        <View style={[styles.emptyChart, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No {categoryLabels[selectedMuscle].toLowerCase()} workouts in the
            last 8 weeks
          </Text>
        </View>
      )}

      {/* Weekly Breakdown */}
      <View style={[styles.weeklyBreakdown, { borderTopColor: colors.border }]}>
        {volumeData.weekLabels.map((label, index) => (
          <View key={label} style={styles.weekItem}>
            <Text style={[styles.weekLabel, { color: colors.textMuted }]}>{label}</Text>
            <View
              style={[
                styles.weekBar,
                {
                  height: Math.max(
                    4,
                    (volumeData.muscleVolumes[selectedMuscle][index] /
                      Math.max(
                        ...volumeData.muscleVolumes[selectedMuscle],
                        1
                      )) *
                      40
                  ),
                  backgroundColor:
                    volumeData.muscleVolumes[selectedMuscle][index] > 0
                      ? categoryColors[selectedMuscle]
                      : colors.bgTertiary,
                },
              ]}
            />
            <Text style={[styles.weekVolume, { color: colors.textSecondary }]}>
              {formatVolume(volumeData.muscleVolumes[selectedMuscle][index])}
            </Text>
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
  muscleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  muscleTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: defaultColors.bgTertiary,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  muscleTabActive: {
    backgroundColor: defaultColors.bgSecondary,
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  muscleDotActive: {
    opacity: 1,
  },
  muscleTabText: {
    ...typography.caption,
    color: defaultColors.textMuted,
    fontSize: 10,
  },
  muscleTabTextActive: {
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  trendContainer: {
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  muscleName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trendText: {
    ...typography.caption,
    fontWeight: "500",
  },
  totalVolume: {
    ...typography.caption,
    color: defaultColors.textSecondary,
  },
  chartWrapper: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  emptyChart: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
  },
  weeklyBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
  },
  weekItem: {
    alignItems: "center",
    flex: 1,
  },
  weekLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  weekBar: {
    width: 20,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  weekVolume: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    fontSize: 9,
  },
});
