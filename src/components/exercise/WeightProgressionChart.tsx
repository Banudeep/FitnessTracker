import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";
import { colors, spacing } from "../../constants/theme";

const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

interface WeightProgressionChartProps {
  data: Array<{ date: Date; weight: number; reps: number; volume: number }>;
  unit: string;
}

export function WeightProgressionChart({
  data,
  unit,
}: WeightProgressionChartProps) {
  if (data.length === 0) return null;

  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  // Calculate chart width based on screen width minus card padding
  const cardPadding = spacing.lg * 2; // Left and right padding of the card
  const screenPadding = spacing.xl * 2; // Screen padding
  const chartWidth = SCREEN_WIDTH - screenPadding - cardPadding;

  const weights = data.map((d) => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight || 1; // Avoid division by zero

  // Add some padding to the range
  const paddedMin = Math.max(0, minWeight - weightRange * 0.1);
  const paddedMax = maxWeight + weightRange * 0.1;
  const paddedRange = paddedMax - paddedMin;

  const plotWidth = chartWidth - CHART_PADDING * 2;
  const plotHeight = CHART_HEIGHT - CHART_PADDING * 2;

  // Generate points for the line
  const points = data
    .map((entry, index) => {
      const x = CHART_PADDING + (index / (data.length - 1 || 1)) * plotWidth;
      const y =
        CHART_PADDING +
        plotHeight -
        ((entry.weight - paddedMin) / paddedRange) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // Generate Y-axis labels
  const yAxisSteps = 5;
  const yAxisLabels = [];
  for (let i = 0; i <= yAxisSteps; i++) {
    const value = paddedMin + (paddedRange / yAxisSteps) * (yAxisSteps - i);
    const y = CHART_PADDING + (i / yAxisSteps) * plotHeight;
    yAxisLabels.push({ value: Math.round(value), y });
  }

  // Generate X-axis labels (dates)
  const xAxisLabels: { label: string; x: number }[] = [];
  const labelInterval = Math.max(1, Math.floor(data.length / 4));
  data.forEach((entry, index) => {
    if (index % labelInterval === 0 || index === data.length - 1) {
      const x =
        CHART_PADDING + (index / Math.max(1, data.length - 1)) * plotWidth;
      const date = new Date(entry.date);
      xAxisLabels.push({
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        x,
      });
    }
  });

  return (
    <View style={styles.chartWrapper}>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {/* Grid lines */}
        {yAxisLabels.map((label, index) => (
          <Line
            key={`grid-${index}`}
            x1={CHART_PADDING}
            y1={label.y}
            x2={chartWidth - CHART_PADDING}
            y2={label.y}
            stroke={colors.bgTertiary}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis labels */}
        {yAxisLabels.map((label, index) => (
          <SvgText
            key={`y-label-${index}`}
            x={CHART_PADDING - 8}
            y={label.y + 4}
            fontSize={11}
            fill={colors.textSecondary}
            textAnchor="end"
          >
            {label.value}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xAxisLabels.map((label, index) => (
          <SvgText
            key={`x-label-${index}`}
            x={label.x}
            y={CHART_HEIGHT - 8}
            fontSize={10}
            fill={colors.textSecondary}
            textAnchor="middle"
          >
            {label.label}
          </SvgText>
        ))}

        {/* Weight line */}
        {data.length > 1 && (
          <Polyline
            points={points}
            fill="none"
            stroke={colors.accentPrimary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {data.map((entry, index) => {
          const x =
            CHART_PADDING + (index / Math.max(1, data.length - 1)) * plotWidth;
          const y =
            CHART_PADDING +
            plotHeight -
            ((entry.weight - paddedMin) / paddedRange) * plotHeight;
          return (
            <Circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r={5}
              fill={colors.accentPrimary}
              stroke={colors.bgPrimary}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
