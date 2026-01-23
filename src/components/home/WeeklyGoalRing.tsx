import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "../../contexts/ThemeContext";

interface WeeklyGoalRingProps {
  current: number;
  total: number;
}

export function WeeklyGoalRing({ current, total }: WeeklyGoalRingProps) {
  const colors = useColors();
  const size = 56;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / total, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size} style={styles.ringSvg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.streakFire}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.ringText, { color: colors.textPrimary }]}>
        {current}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ringContainer: {
    position: "relative",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSvg: {
    position: "absolute",
  },
  ringText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

