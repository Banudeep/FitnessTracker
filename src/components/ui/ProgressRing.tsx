import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, typography } from "../../constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Current progress value */
  current: number;
  /** Total/goal value */
  total: number;
  /** Size of the ring (width and height) */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Progress color (or array for gradient) */
  progressColor?: string | string[];
  /** Background ring color */
  backgroundColor?: string;
  /** Whether to animate the progress */
  animated?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Show percentage instead of current/total */
  showPercentage?: boolean;
  /** Custom center content */
  centerContent?: React.ReactNode;
  /** Hide the center text */
  hideText?: boolean;
  /** Text color */
  textColor?: string;
  /** Font size for the text */
  fontSize?: number;
  /** Show glow effect when progress is high */
  showGlow?: boolean;
}

export function ProgressRing({
  current,
  total,
  size = 80,
  strokeWidth = 6,
  progressColor = colors.accentPrimary,
  backgroundColor = "rgba(255,255,255,0.1)",
  animated = true,
  animationDuration = 800,
  showPercentage = false,
  centerContent,
  hideText = false,
  textColor = colors.textPrimary,
  fontSize,
  showGlow = false,
}: ProgressRingProps) {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / total, 1);
  const progressValue = Math.max(0, progress);

  // Calculate dynamic font size based on ring size if not provided
  const calculatedFontSize = fontSize || Math.max(12, size * 0.18);

  // Determine if we should use gradient
  const useGradient = Array.isArray(progressColor);
  const gradientId = `progress-gradient-${size}`;

  useEffect(() => {
    if (animated) {
      animatedProgress.setValue(0);
      Animated.timing(animatedProgress, {
        toValue: progressValue,
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(progressValue);
    }
  }, [progressValue, animated, animationDuration]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const renderCenterContent = () => {
    if (centerContent) return centerContent;
    if (hideText) return null;

    const displayText = showPercentage
      ? `${Math.round(progress * 100)}%`
      : `${current}/${total}`;

    return (
      <Text
        style={[
          styles.ringText,
          {
            color: textColor,
            fontSize: calculatedFontSize,
          },
        ]}
      >
        {displayText}
      </Text>
    );
  };

  return (
    <View
      style={[
        styles.ringContainer,
        { width: size, height: size },
        showGlow && progress >= 1 && styles.glowEffect,
      ]}
    >
      <Svg width={size} height={size} style={styles.ringSvg}>
        {useGradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {(progressColor as string[]).map((color, index) => (
                <Stop
                  key={index}
                  offset={`${(index / (progressColor.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
        )}

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={
            useGradient ? `url(#${gradientId})` : (progressColor as string)
          }
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.centerContainer}>{renderCenterContent()}</View>
    </View>
  );
}

// Preset variants for common use cases
export function GoalRing(props: Omit<ProgressRingProps, "showPercentage">) {
  return <ProgressRing {...props} showGlow progressColor={colors.streakFire} />;
}

export function TimerRing(
  props: Omit<ProgressRingProps, "showPercentage" | "progressColor">
) {
  return (
    <ProgressRing
      {...props}
      progressColor={[colors.accentPrimary, colors.accentInfo]}
      backgroundColor="rgba(255,255,255,0.05)"
    />
  );
}

export function PercentageRing(
  props: Omit<ProgressRingProps, "showPercentage">
) {
  return <ProgressRing {...props} showPercentage />;
}

const styles = StyleSheet.create({
  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ringSvg: {
    position: "absolute",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: {
    fontWeight: "700",
  },
  glowEffect: {
    shadowColor: colors.streakFire,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});
