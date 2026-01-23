import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import {
  colors as defaultColors,
  spacing,
  borderRadius,
  typography,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";
import type { BodyMeasurement } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - spacing.lg * 2;
const CHART_HEIGHT = 180;

interface BodyMeasurementsChartProps {
  measurements: BodyMeasurement[];
  preferredUnit: "lbs" | "kg";
}

type MeasurementKey =
  | "weight"
  | "chest"
  | "waist"
  | "hips"
  | "leftArm"
  | "rightArm"
  | "leftThigh"
  | "rightThigh";

const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  weight: "Weight",
  chest: "Chest",
  waist: "Waist",
  hips: "Hips",
  leftArm: "L. Arm",
  rightArm: "R. Arm",
  leftThigh: "L. Thigh",
  rightThigh: "R. Thigh",
};

// MEASUREMENT_COLORS moved inside component for dynamic theming

export const BodyMeasurementsChart: React.FC<BodyMeasurementsChartProps> = ({
  measurements,
  preferredUnit,
}) => {
  const colors = useColors();

  const MEASUREMENT_COLORS = useMemo(() => ({
    weight: colors.accentPrimary,
    chest: colors.accentSecondary,
    waist: colors.accentWarning,
    hips: colors.accentInfo,
    leftArm: "#9B59B6",
    rightArm: "#9B59B6",
    leftThigh: "#1ABC9C",
    rightThigh: "#1ABC9C",
  }), [colors]);
  const [selectedMetric, setSelectedMetric] =
    useState<MeasurementKey>("weight");

  // Sort measurements by date (oldest first for chart)
  const sortedMeasurements = useMemo(() => {
    return [...measurements]
      .filter((m) => m[selectedMetric] !== null)
      .sort(
        (a, b) =>
          new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
      )
      .slice(-10); // Last 10 measurements
  }, [measurements, selectedMetric]);

  // Get data points for selected metric
  const dataPoints = useMemo(() => {
    return sortedMeasurements.map((m) => ({
      value: m[selectedMetric] as number,
      date: new Date(m.measuredAt),
    }));
  }, [sortedMeasurements, selectedMetric]);

  // Calculate stats
  const stats = useMemo(() => {
    if (dataPoints.length === 0) return null;

    const values = dataPoints.map((d) => d.value);
    const current = values[values.length - 1];
    const first = values[0];
    const change = current - first;
    const changePercent = ((change / first) * 100).toFixed(1);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { current, first, change, changePercent, min, max };
  }, [dataPoints]);

  // Calculate chart dimensions
  const chartData = useMemo(() => {
    if (dataPoints.length < 2 || !stats) return null;

    const padding = 10;
    const range = stats.max - stats.min || 1;
    const yScale = (CHART_HEIGHT - padding * 2) / range;

    const points = dataPoints.map((point, index) => {
      const x = (index / (dataPoints.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - padding - (point.value - stats.min) * yScale;
      return { x, y, value: point.value, date: point.date };
    });

    // Create SVG path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    // Create fill path
    const fillPath = `${path} L ${
      points[points.length - 1].x
    } ${CHART_HEIGHT} L ${points[0].x} ${CHART_HEIGHT} Z`;

    return { points, path, fillPath };
  }, [dataPoints, stats]);

  const formatValue = (value: number, metric: MeasurementKey) => {
    if (metric === "weight") {
      // Input value is in LBS (standardized in tools.tsx)
      return preferredUnit === "lbs"
        ? `${Math.round(value)} lbs`
        : `${(value * 0.453592).toFixed(1)} kg`;
    }
    return `${value} ${preferredUnit === "lbs" ? "in" : "cm"}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Available metrics (only show those with data)
  const availableMetrics = useMemo(() => {
    const metrics: MeasurementKey[] = [
      "weight",
      "chest",
      "waist",
      "hips",
      "leftArm",
      "rightArm",
      "leftThigh",
      "rightThigh",
    ];
    return metrics.filter((m) =>
      measurements.some((measurement) => measurement[m] !== null)
    );
  }, [measurements]);

  if (measurements.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No measurements recorded yet</Text>
        <Text style={styles.emptySubtext}>
          Add body measurements to track your progress over time
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Metric Selector */}
      <View style={styles.metricSelector}>
        {availableMetrics.map((metric) => (
          <TouchableOpacity
            key={metric}
            style={[
              styles.metricPill,
              selectedMetric === metric && {
                backgroundColor: MEASUREMENT_COLORS[metric] + "30",
                borderColor: MEASUREMENT_COLORS[metric],
              },
            ]}
            onPress={() => setSelectedMetric(metric)}
          >
            <Text
              style={[
                styles.metricPillText,
                selectedMetric === metric && {
                  color: MEASUREMENT_COLORS[metric],
                },
              ]}
            >
              {MEASUREMENT_LABELS[metric]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current</Text>
            <Text
              style={[
                styles.statValue,
                { color: MEASUREMENT_COLORS[selectedMetric] },
              ]}
            >
              {formatValue(stats.current, selectedMetric)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Change</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    stats.change < 0
                      ? selectedMetric === "weight" ||
                        selectedMetric === "waist"
                        ? colors.accentSecondary
                        : colors.accentDanger
                      : selectedMetric === "weight" ||
                        selectedMetric === "waist"
                      ? colors.accentWarning
                      : colors.accentSecondary,
                },
              ]}
            >
              {stats.change > 0 ? "+" : ""}
              {selectedMetric === "weight"
                ? preferredUnit === "lbs"
                  ? `${Math.round(stats.change)} lbs`
                  : `${(stats.change * 0.453592).toFixed(1)} kg`
                : stats.change.toFixed(1)}
              {selectedMetric !== "weight" &&
                (preferredUnit === "lbs" ? " in" : " cm")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>% Change</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    parseFloat(stats.changePercent) < 0
                      ? selectedMetric === "weight" ||
                        selectedMetric === "waist"
                        ? colors.accentSecondary
                        : colors.accentDanger
                      : selectedMetric === "weight" ||
                        selectedMetric === "waist"
                      ? colors.accentWarning
                      : colors.accentSecondary,
                },
              ]}
            >
              {parseFloat(stats.changePercent) > 0 ? "+" : ""}
              {stats.changePercent}%
            </Text>
          </View>
        </View>
      )}

      {/* Chart */}
      {chartData && chartData.points.length >= 2 ? (
        <View style={styles.chartContainer}>
          <View style={styles.yAxisLabels}>
            <Text style={styles.yAxisLabel}>
              {selectedMetric === "weight"
                ? preferredUnit === "lbs"
                  ? Math.round(stats!.max)
                  : (stats!.max * 0.453592).toFixed(1)
                : stats!.max.toFixed(1)}
            </Text>
            <Text style={styles.yAxisLabel}>
              {selectedMetric === "weight"
                ? preferredUnit === "lbs"
                  ? Math.round(stats!.min)
                  : (stats!.min * 0.453592).toFixed(1)
                : stats!.min.toFixed(1)}
            </Text>
          </View>
          <View style={styles.chart}>
            {/* Grid lines */}
            <View style={styles.gridLine} />
            <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
            <View style={[styles.gridLine, { top: CHART_HEIGHT - 1 }]} />

            {/* Line chart using View-based approach */}
            {chartData.points.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = chartData.points[index - 1];
              const dx = point.x - prevPoint.x;
              const dy = point.y - prevPoint.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              return (
                <View
                  key={index}
                  style={[
                    styles.lineSegment,
                    {
                      width: length,
                      left: prevPoint.x,
                      top: prevPoint.y,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: MEASUREMENT_COLORS[selectedMetric],
                    },
                  ]}
                />
              );
            })}

            {/* Data points */}
            {chartData.points.map((point, index) => (
              <View
                key={index}
                style={[
                  styles.dataPoint,
                  {
                    left: point.x - 5,
                    top: point.y - 5,
                    backgroundColor: MEASUREMENT_COLORS[selectedMetric],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.noChartData}>
          <Text style={styles.noChartText}>
            Need at least 2 measurements to show chart
          </Text>
        </View>
      )}

      {/* X-axis labels */}
      {chartData && chartData.points.length >= 2 && (
        <View style={styles.xAxisLabels}>
          <Text style={styles.xAxisLabel}>
            {formatDate(chartData.points[0].date)}
          </Text>
          <Text style={styles.xAxisLabel}>
            {formatDate(chartData.points[chartData.points.length - 1].date)}
          </Text>
        </View>
      )}

      {/* Recent entries */}
      <View style={styles.recentEntries}>
        <Text style={styles.recentTitle}>Recent Entries</Text>
        {sortedMeasurements
          .slice(-5)
          .reverse()
          .map((m, index) => (
            <View key={m.id || index} style={styles.entryRow}>
              <Text style={styles.entryDate}>
                {formatDate(new Date(m.measuredAt))}
              </Text>
              <Text
                style={[
                  styles.entryValue,
                  { color: MEASUREMENT_COLORS[selectedMetric] },
                ]}
              >
                {formatValue(m[selectedMetric] as number, selectedMetric)}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
    color: defaultColors.textMuted,
    textAlign: "center",
  },
  metricSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metricPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: defaultColors.bgPrimary,
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  metricPillText: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginBottom: 2,
  },
  statValue: {
    ...typography.body,
    fontWeight: "700",
  },
  chartContainer: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  yAxisLabels: {
    width: 40,
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  yAxisLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    fontSize: 10,
  },
  chart: {
    flex: 1,
    height: CHART_HEIGHT,
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    height: 1,
    backgroundColor: defaultColors.border,
    opacity: 0.3,
    top: 0,
  },
  lineSegment: {
    position: "absolute",
    height: 2,
    transformOrigin: "left center",
  },
  dataPoint: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderWidth: 2,
    borderColor: defaultColors.bgSecondary,
  },
  noChartData: {
    height: CHART_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  noChartText: {
    ...typography.caption,
    color: defaultColors.textMuted,
  },
  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 40,
    marginBottom: spacing.md,
  },
  xAxisLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    fontSize: 10,
  },
  recentEntries: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
    paddingTop: spacing.md,
  },
  recentTitle: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  entryDate: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
  },
  entryValue: {
    ...typography.bodySmall,
    fontWeight: "600",
  },
});

export default BodyMeasurementsChart;
