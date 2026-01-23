import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, ViewStyle } from "react-native";
import { colors, spacing, borderRadius } from "../../constants/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Basic Skeleton element with shimmer animation
export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

// Skeleton for a workout card
export function WorkoutCardSkeleton() {
  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutCardHeader}>
        <View>
          <Skeleton width={120} height={18} />
          <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
        </View>
        <Skeleton width={60} height={24} borderRadius={borderRadius.full} />
      </View>
      <View style={styles.workoutCardStats}>
        <Skeleton width={70} height={14} />
        <Skeleton width={70} height={14} />
        <Skeleton width={70} height={14} />
      </View>
    </View>
  );
}

// Skeleton for a list of workout cards
export function WorkoutListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <WorkoutCardSkeleton key={index} />
      ))}
    </View>
  );
}

// Skeleton for exercise item in a list
export function ExerciseItemSkeleton() {
  return (
    <View style={styles.exerciseItem}>
      <Skeleton width={48} height={48} borderRadius={borderRadius.md} />
      <View style={styles.exerciseContent}>
        <Skeleton width={140} height={16} />
        <Skeleton width={100} height={12} style={{ marginTop: spacing.xs }} />
      </View>
      <Skeleton width={24} height={24} borderRadius={12} />
    </View>
  );
}

// Skeleton for a list of exercises
export function ExerciseListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <ExerciseItemSkeleton key={index} />
      ))}
    </View>
  );
}

// Skeleton for a stat card
export function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      <Skeleton width={24} height={24} borderRadius={12} />
      <Skeleton width={50} height={28} style={{ marginTop: spacing.sm }} />
      <Skeleton width={70} height={12} style={{ marginTop: spacing.xs }} />
    </View>
  );
}

// Skeleton for stats row
export function StatsRowSkeleton() {
  return (
    <View style={styles.statsRow}>
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </View>
  );
}

// Skeleton for template card
export function TemplateCardSkeleton() {
  return (
    <View style={styles.templateCard}>
      <Skeleton width={140} height={18} />
      <Skeleton width="100%" height={12} style={{ marginTop: spacing.sm }} />
      <Skeleton width="80%" height={12} style={{ marginTop: spacing.xs }} />
      <View style={styles.templateFooter}>
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={28} borderRadius={borderRadius.md} />
      </View>
    </View>
  );
}

// Skeleton for template list
export function TemplateListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <TemplateCardSkeleton key={index} />
      ))}
    </View>
  );
}

// Skeleton for the progress chart
export function ChartSkeleton() {
  return (
    <View style={styles.chartContainer}>
      <Skeleton width={100} height={16} style={{ marginBottom: spacing.md }} />
      <Skeleton width="100%" height={200} borderRadius={borderRadius.lg} />
    </View>
  );
}

// Skeleton for calendar
export function CalendarSkeleton() {
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width={120} height={18} />
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>
      <View style={styles.calendarGrid}>
        {Array.from({ length: 35 }).map((_, index) => (
          <Skeleton
            key={index}
            width={36}
            height={36}
            borderRadius={18}
            style={styles.calendarDay}
          />
        ))}
      </View>
    </View>
  );
}

// Full page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <View style={styles.pageContainer}>
      <Skeleton width={200} height={32} style={{ marginBottom: spacing.lg }} />
      <Skeleton width={150} height={16} style={{ marginBottom: spacing.xl }} />
      <StatsRowSkeleton />
      <View style={{ marginTop: spacing.xl }}>
        <Skeleton
          width={120}
          height={20}
          style={{ marginBottom: spacing.md }}
        />
        <WorkoutListSkeleton count={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.bgTertiary,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgElevated,
    opacity: 0.3,
    width: 100,
  },
  listContainer: {
    gap: spacing.md,
  },
  workoutCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  workoutCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  workoutCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  exerciseContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  templateCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  templateFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  chartContainer: {
    marginTop: spacing.lg,
  },
  calendarContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  calendarDay: {
    margin: spacing.xs / 2,
  },
  pageContainer: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgPrimary,
  },
});
