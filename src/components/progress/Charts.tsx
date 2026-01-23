import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { colors as defaultColors, spacing } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 160;
const BAR_WIDTH = 28;

interface WeeklyChartProps {
  data: { day: string; count: number; date: Date }[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const colors = useColors();
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barSpacing =
    (CHART_WIDTH - data.length * BAR_WIDTH) / (data.length + 1);

  return (
    <View style={styles.chart}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {data.map((item, index) => {
          const barHeight = Math.max(
            (item.count / maxCount) * (CHART_HEIGHT - 40),
            item.count > 0 ? 20 : 0
          );
          const x = barSpacing + index * (BAR_WIDTH + barSpacing);
          const y = CHART_HEIGHT - 30 - barHeight;

          return (
            <React.Fragment key={`${item.day}-${index}`}>
              <Rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barHeight || 8}
                rx={4}
                fill={item.count > 0 ? colors.accentPrimary : colors.bgTertiary}
              />
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={CHART_HEIGHT - 10}
                fontSize={11}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {item.day}
              </SvgText>
              {item.count > 0 && (
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={y - 6}
                  fontSize={10}
                  fill={colors.textPrimary}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.count}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

interface MonthlyChartProps {
  data: { week: string; count: number }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const colors = useColors();
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.monthlyBars}>
      {data.map((item, index) => (
        <View key={`${item.week}-${index}`} style={styles.monthlyBarContainer}>
          <Text style={[styles.monthlyBarValue, { color: colors.textPrimary }]}>{item.count}</Text>
          <View style={[styles.monthlyBarTrack, { backgroundColor: colors.bgTertiary }]}>
            <View
              style={[
                styles.monthlyBarFill,
                { backgroundColor: colors.accentSecondary },
                {
                  height: `${Math.max(
                    (item.count / maxCount) * 100,
                    item.count > 0 ? 10 : 0
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.monthlyBarLabel, { color: colors.textSecondary }]}>{item.week}</Text>
        </View>
      ))}
    </View>
  );
}

interface ProgressiveOverloadChartProps {
  data: { week: string; volume: number }[];
}

export function ProgressiveOverloadChart({
  data,
}: ProgressiveOverloadChartProps) {
  const colors = useColors();
  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const barSpacing =
    (CHART_WIDTH - data.length * BAR_WIDTH) / (data.length + 1);

  return (
    <View style={styles.chart}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {data.map((item, index) => {
          const barHeight = Math.max(
            (item.volume / maxVolume) * (CHART_HEIGHT - 40),
            item.volume > 0 ? 20 : 0
          );
          const x = barSpacing + index * (BAR_WIDTH + barSpacing);
          const y = CHART_HEIGHT - 30 - barHeight;

          return (
            <React.Fragment key={`${item.week}-${index}`}>
              <Rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barHeight || 8}
                rx={4}
                fill={
                  item.volume > 0 ? colors.accentSecondary : colors.bgTertiary
                }
              />
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={CHART_HEIGHT - 10}
                fontSize={11}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {item.week}
              </SvgText>
              {item.volume > 0 && (
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={y - 6}
                  fontSize={9}
                  fill={colors.textPrimary}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.volume >= 1000
                    ? `${(item.volume / 1000).toFixed(0)}K`
                    : item.volume}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: defaultColors.textPrimary,
    marginBottom: spacing.xs,
  },
  monthlyBarTrack: {
    width: 32,
    height: 70,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  monthlyBarFill: {
    width: "100%",
    backgroundColor: defaultColors.accentSecondary,
    borderRadius: 6,
  },
  monthlyBarLabel: {
    fontSize: 11,
    color: defaultColors.textSecondary,
    marginTop: spacing.sm,
  },
});
