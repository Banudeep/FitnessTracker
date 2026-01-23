import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface MonthNavigatorProps {
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export function MonthNavigator({
  currentDate,
  onPrevious,
  onNext,
  canGoNext,
}: MonthNavigatorProps) {
  const colors = useColors();
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.navigator}>
      <TouchableOpacity onPress={onPrevious} style={[styles.navButton, { backgroundColor: colors.bgSecondary }]}>
        <ChevronLeft size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.navTitle, { color: colors.textPrimary }]}>{monthYear}</Text>
      <TouchableOpacity
        onPress={onNext}
        style={[styles.navButton, { backgroundColor: colors.bgSecondary }, !canGoNext && styles.navButtonDisabled]}
        disabled={!canGoNext}
      >
        <ChevronRight
          size={24}
          color={canGoNext ? colors.textPrimary : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

interface WeekNavigatorProps {
  weekStart: Date;
  weekEnd: Date;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  canGoPrevious?: boolean;
}

export function WeekNavigator({
  weekStart,
  weekEnd,
  onPrevious,
  onNext,
  canGoNext,
  canGoPrevious = true,
}: WeekNavigatorProps) {
  const colors = useColors();
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  return (
    <View style={styles.navigator}>
      <TouchableOpacity
        onPress={onPrevious}
        style={[styles.navButton, { backgroundColor: colors.bgSecondary }, !canGoPrevious && styles.navButtonDisabled]}
        disabled={!canGoPrevious}
      >
        <ChevronLeft
          size={24}
          color={canGoPrevious ? colors.textPrimary : colors.textMuted}
        />
      </TouchableOpacity>
      <Text style={[styles.navTitleSmall, { color: colors.textPrimary }]}>{weekLabel}</Text>
      <TouchableOpacity
        onPress={onNext}
        style={[styles.navButton, { backgroundColor: colors.bgSecondary }, !canGoNext && styles.navButtonDisabled]}
        disabled={!canGoNext}
      >
        <ChevronRight
          size={24}
          color={canGoNext ? colors.textPrimary : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navTitle: {
    ...typography.heading3,
  },
  navTitleSmall: {
    ...typography.body,
    fontWeight: "600",
  },
});
