import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { colors as defaultColors, spacing, typography } from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";
import * as Haptics from "expo-haptics";

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface ScrollPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export const ScrollPicker: React.FC<ScrollPickerProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 500,
  step = 5,
  label,
  unit,
}) => {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const lastHapticValue = useRef(value);
  const isScrolling = useRef(false);

  // Generate array of values
  const values: number[] = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }

  // Find index of current value (or closest)
  const getClosestIndex = (val: number) => {
    let closestIndex = 0;
    let closestDiff = Math.abs(values[0] - val);
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - val);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const selectedIndex = getClosestIndex(value);

  // Scroll to initial value on mount
  useEffect(() => {
    if (scrollViewRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, []);

  // Update scroll position when value changes externally (not from scrolling)
  useEffect(() => {
    if (!isScrolling.current && scrollViewRef.current && selectedIndex >= 0) {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: true,
      });
    }
  }, [value, selectedIndex]);

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const newValue = values[clampedIndex];

      if (newValue !== value) {
        onValueChange(newValue);
      }
    },
    [values, value, onValueChange]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const scrollValue = values[clampedIndex];

      // Trigger haptic on value change during scroll
      if (scrollValue !== lastHapticValue.current && Platform.OS !== "web") {
        lastHapticValue.current = scrollValue;
        Haptics.selectionAsync();
      }
    },
    [values]
  );

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}

      <View style={styles.pickerWrapper}>
        {/* Selection indicator */}
        <View
          style={[styles.selectionIndicator, { backgroundColor: colors.bgTertiary }]}
          pointerEvents="none"
        />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT, // Add padding for first/last items
          }}
          style={styles.scrollView}
          nestedScrollEnabled={true}
          directionalLockEnabled={true}
          scrollEnabled={true}
          bounces={false}
          alwaysBounceVertical={false}
        >
          {values.map((item) => {
            const isSelected = item === value;
            return (
              <View key={item} style={styles.itemContainer}>
                  <Text
                    style={[
                      styles.itemText,
                      isSelected && { color: colors.textPrimary },
                      !isSelected && { color: colors.textMuted },
                    ]}
                  >
                    {item}
                  </Text>
              </View>
            );
          })}
        </ScrollView>

        {unit && (
          <View style={styles.unitContainer}>
            <Text style={styles.unitText}>{unit}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Compact scroll wheel for inline use
interface CompactScrollPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  values: number[];
  width?: number;
  formatValue?: (value: number) => string;
}

const CompactScrollPicker: React.FC<CompactScrollPickerProps> = ({
  value,
  onValueChange,
  values,
  width = 60,
  formatValue,
}) => {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const lastHapticValue = useRef(value);
  const isScrolling = useRef(false);

  const getClosestIndex = (val: number) => {
    let closestIndex = 0;
    let closestDiff = Math.abs(values[0] - val);
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - val);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const selectedIndex = getClosestIndex(value);

  useEffect(() => {
    if (scrollViewRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!isScrolling.current && scrollViewRef.current && selectedIndex >= 0) {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: true,
      });
    }
  }, [value, selectedIndex]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const newValue = values[clampedIndex];

      if (newValue !== value) {
        onValueChange(newValue);
      }
    },
    [values, value, onValueChange]
  );

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const scrollValue = values[clampedIndex];

      if (scrollValue !== lastHapticValue.current && Platform.OS !== "web") {
        lastHapticValue.current = scrollValue;
        Haptics.selectionAsync();
      }
    },
    [values]
  );

  return (
    <View style={[styles.compactPickerWrapper, { width }]}>
      <View
        style={[styles.compactSelectionIndicator, { backgroundColor: colors.bgTertiary }]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT,
        }}
        style={styles.compactScrollView}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        scrollEnabled={true}
        bounces={false}
        alwaysBounceVertical={false}
      >
        {values.map((item) => {
          const isSelected = item === value;
          const displayValue = formatValue
            ? formatValue(item)
            : item.toString().padStart(2, "0");
          return (
            <View key={item} style={styles.itemContainer}>
              <Text
                style={[
                  styles.compactItemText,
                  isSelected && { color: colors.textPrimary },
                  !isSelected && { color: colors.textMuted },
                ]}
              >
                {displayValue}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Time picker for rest timer (minutes:seconds format)
interface TimeScrollPickerProps {
  value: number; // Total seconds
  onValueChange: (value: number) => void;
  minMinutes?: number;
  maxMinutes?: number;
}

export const TimeScrollPicker: React.FC<TimeScrollPickerProps> = ({
  value,
  onValueChange,
  minMinutes = 0,
  maxMinutes = 5,
}) => {
  const colors = useColors();
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  // Generate minute values
  const minuteValues: number[] = [];
  for (let i = minMinutes; i <= maxMinutes; i++) {
    minuteValues.push(i);
  }

  // Second values in 15-second intervals
  const secondValues = [0, 15, 30, 45];

  const handleMinutesChange = (newMinutes: number) => {
    onValueChange(newMinutes * 60 + seconds);
  };

  const handleSecondsChange = (newSeconds: number) => {
    onValueChange(minutes * 60 + newSeconds);
  };

  return (
    <View style={styles.timeContainer}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Rest Timer</Text>

      <View style={styles.timePickerRow}>
        <CompactScrollPicker
          value={minutes}
          onValueChange={handleMinutesChange}
          values={minuteValues}
          width={50}
        />

        <Text style={[styles.timeSeparator, { color: colors.textPrimary }]}>:</Text>

        <CompactScrollPicker
          value={seconds}
          onValueChange={handleSecondsChange}
          values={secondValues}
          width={50}
        />
      </View>

      <Text style={[styles.timeLabel, { color: colors.textMuted }]}>min : sec</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pickerWrapper: {
    height: PICKER_HEIGHT,
    width: 120,
    position: "relative",
    overflow: "hidden",
  },
  selectionIndicator: {
    position: "absolute",
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: 12,
    zIndex: 0,
  },
  scrollView: {
    height: PICKER_HEIGHT,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontSize: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  itemTextSelected: {
    color: defaultColors.textPrimary,
  },
  itemTextUnselected: {
    color: defaultColors.textMuted,
    opacity: 0.5,
  },
  unitContainer: {
    position: "absolute",
    right: -40,
    top: ITEM_HEIGHT + ITEM_HEIGHT / 2 - 10,
    zIndex: 10,
  },
  unitText: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
  },

  // Compact picker styles (for time)
  compactPickerWrapper: {
    height: PICKER_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  compactSelectionIndicator: {
    position: "absolute",
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: 8,
    zIndex: 0,
  },
  compactScrollView: {
    height: PICKER_HEIGHT,
  },
  compactItemText: {
    fontSize: 24,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },

  // Time picker styles
  timeContainer: {
    alignItems: "center",
    width: "100%",
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: "600",
    color: defaultColors.textPrimary,
    marginHorizontal: spacing.sm,
    paddingBottom: 4,
  },
  timeLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
  },
});
