import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Clock,
  Calendar,
  TrendingUp,
  Vibrate,
  Volume2,
  Settings,
} from "lucide-react-native";
import {
  colors as defaultColors,
  spacing,
  borderRadius,
  typography,
} from "../src/constants/theme";
import { useSettingsStore } from "../src/stores/settingsStore";
import { useColors } from "../src/contexts/ThemeContext";
import {
  requestNotificationPermissions,
  areNotificationsEnabled,
  scheduleWorkoutReminders,
  cancelWorkoutReminders,
  scheduleWeeklyProgressSummary,
  cancelWeeklyProgressSummary,
  isRunningInExpoGo,
} from "../src/services/notifications";
import { showToast } from "../src/components/ui";
import { ScrollPicker } from "../src/components/ui/ScrollPicker";
import { BottomSheet } from "../src/components/ui/BottomSheet";

const DAYS_OF_WEEK = [
  { id: 0, short: "Sun", full: "Sunday" },
  { id: 1, short: "Mon", full: "Monday" },
  { id: 2, short: "Tue", full: "Tuesday" },
  { id: 3, short: "Wed", full: "Wednesday" },
  { id: 4, short: "Thu", full: "Thursday" },
  { id: 5, short: "Fri", full: "Friday" },
  { id: 6, short: "Sat", full: "Saturday" },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const {
    notifications,
    setNotificationsEnabled,
    setWorkoutReminders,
    setRestDayReminders,
    setWeeklyProgressSummary,
    setRestTimerFeedback,
  } = useSettingsStore();

  const colors = useColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);

  // Check notification permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Parse time from settings
  useEffect(() => {
    const [h, m] = notifications.workoutReminders.time.split(":").map(Number);
    setTempHour(h);
    setTempMinute(m);
  }, [notifications.workoutReminders.time]);

  const checkPermissions = async () => {
    const enabled = await areNotificationsEnabled();
    setHasPermission(enabled);
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    setIsLoading(false);

    if (granted) {
      setNotificationsEnabled(true);
      showToast({ type: "success", title: "Notifications enabled!" });
    } else {
      showToast({
        type: "error",
        title: "Permission denied",
        message: "Enable notifications in your device settings",
      });
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && !hasPermission) {
      await handleEnableNotifications();
      return;
    }

    setNotificationsEnabled(enabled);

    if (!enabled) {
      // Cancel all scheduled notifications
      await cancelWorkoutReminders();
      await cancelWeeklyProgressSummary();
    }
  };

  const handleToggleWorkoutReminders = async (enabled: boolean) => {
    setWorkoutReminders(enabled);

    if (enabled && notifications.enabled) {
      await scheduleWorkoutReminders(
        notifications.workoutReminders.time,
        notifications.workoutReminders.days
      );
      showToast({ type: "success", title: "Workout reminders scheduled" });
    } else {
      await cancelWorkoutReminders();
    }
  };

  const handleDayToggle = async (dayId: number) => {
    const currentDays = notifications.workoutReminders.days;
    let newDays: number[];

    if (currentDays.includes(dayId)) {
      newDays = currentDays.filter((d) => d !== dayId);
    } else {
      newDays = [...currentDays, dayId].sort((a, b) => a - b);
    }

    setWorkoutReminders(
      notifications.workoutReminders.enabled,
      undefined,
      newDays
    );

    // Reschedule if enabled
    if (notifications.workoutReminders.enabled && notifications.enabled) {
      await scheduleWorkoutReminders(
        notifications.workoutReminders.time,
        newDays
      );
    }
  };

  const handleTimeConfirm = async () => {
    const newTime = `${tempHour.toString().padStart(2, "0")}:${tempMinute
      .toString()
      .padStart(2, "0")}`;
    setWorkoutReminders(notifications.workoutReminders.enabled, newTime);
    setShowTimePicker(false);

    // Reschedule if enabled
    if (notifications.workoutReminders.enabled && notifications.enabled) {
      await scheduleWorkoutReminders(
        newTime,
        notifications.workoutReminders.days
      );
      showToast({ type: "success", title: "Reminder time updated" });
    }
  };

  const handleToggleWeeklySummary = async (enabled: boolean) => {
    setWeeklyProgressSummary(enabled);

    if (enabled && notifications.enabled) {
      await scheduleWeeklyProgressSummary();
      showToast({ type: "success", title: "Weekly summary scheduled" });
    } else {
      await cancelWeeklyProgressSummary();
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getSelectedDaysText = (): string => {
    const days = notifications.workoutReminders.days;
    if (days.length === 0) return "No days selected";
    if (days.length === 7) return "Every day";
    if (JSON.stringify(days) === JSON.stringify([1, 2, 3, 4, 5]))
      return "Weekdays";
    if (JSON.stringify(days) === JSON.stringify([0, 6])) return "Weekends";
    return days.map((d) => DAYS_OF_WEEK[d].short).join(", ");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Permission Warning */}
        {hasPermission === false && (
          <TouchableOpacity
            style={styles.permissionWarning}
            onPress={() => Linking.openSettings()}
          >
            <BellOff size={20} color={colors.accentWarning} />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>
                Notifications are disabled
              </Text>
              <Text style={styles.permissionSubtitle}>
                Tap to open settings and enable notifications
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Expo Go Warning */}
        {isRunningInExpoGo() && (
          <View
            style={[
              styles.permissionWarning,
              { backgroundColor: `${colors.accentPrimary}15` },
            ]}
          >
            <Bell size={20} color={colors.accentPrimary} />
            <View style={styles.permissionTextContainer}>
              <Text
                style={[
                  styles.permissionTitle,
                  { color: colors.accentPrimary },
                ]}
              >
                Running in Expo Go
              </Text>
              <Text style={styles.permissionSubtitle}>
                Push notifications require a development build. Settings will be
                saved for when you build the app.
              </Text>
            </View>
          </View>
        )}

        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.mainToggleRow}>
            <View style={styles.mainToggleLeft}>
              <View style={styles.iconContainer}>
                <Bell size={22} color={colors.accentPrimary} />
              </View>
              <View>
                <Text style={styles.mainToggleTitle}>Enable Notifications</Text>
                <Text style={styles.mainToggleSubtitle}>
                  {notifications.enabled
                    ? "Notifications are on"
                    : "All notifications are off"}
                </Text>
              </View>
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.accentPrimary} />
            ) : (
              <Switch
                value={notifications.enabled}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: colors.border,
                  true: colors.accentPrimary,
                }}
                thumbColor={
                  Platform.OS === "ios" ? "#FFFFFF" : colors.bgSecondary
                }
              />
            )}
          </View>
        </View>

        {/* Workout Reminders Section */}
        <View
          style={[
            styles.section,
            !notifications.enabled && styles.sectionDisabled,
          ]}
        >
          <Text style={styles.sectionTitle}>Workout Reminders</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Clock size={20} color={colors.textMuted} />
              <Text style={styles.settingLabel}>Daily Reminders</Text>
            </View>
            <Switch
              value={notifications.workoutReminders.enabled}
              onValueChange={handleToggleWorkoutReminders}
              disabled={!notifications.enabled}
              trackColor={{ false: colors.border, true: colors.accentPrimary }}
              thumbColor={
                Platform.OS === "ios" ? "#FFFFFF" : colors.bgSecondary
              }
            />
          </View>

          {notifications.workoutReminders.enabled && (
            <>
              {/* Time Picker */}
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
                disabled={!notifications.enabled}
              >
                <Text style={styles.timePickerLabel}>Reminder Time</Text>
                <View style={styles.timePickerValue}>
                  <Text style={styles.timePickerText}>
                    {formatTime(notifications.workoutReminders.time)}
                  </Text>
                  <ArrowLeft
                    size={16}
                    color={colors.textMuted}
                    style={{ transform: [{ rotate: "180deg" }] }}
                  />
                </View>
              </TouchableOpacity>

              {/* Day Selection */}
              <View style={styles.daysContainer}>
                <Text style={styles.daysLabel}>Workout Days</Text>
                <Text style={styles.daysSubtitle}>{getSelectedDaysText()}</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.dayPill,
                        notifications.workoutReminders.days.includes(day.id) &&
                          styles.dayPillActive,
                      ]}
                      onPress={() => handleDayToggle(day.id)}
                      disabled={!notifications.enabled}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          notifications.workoutReminders.days.includes(
                            day.id
                          ) && styles.dayPillTextActive,
                        ]}
                      >
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Other Notifications Section */}
        <View
          style={[
            styles.section,
            !notifications.enabled && styles.sectionDisabled,
          ]}
        >
          <Text style={styles.sectionTitle}>Other Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Calendar size={20} color={colors.textMuted} />
              <View>
                <Text style={styles.settingLabel}>Rest Day Reminders</Text>
                <Text style={styles.settingSubtext}>
                  Get reminded to rest on non-workout days
                </Text>
              </View>
            </View>
            <Switch
              value={notifications.restDayReminders}
              onValueChange={setRestDayReminders}
              disabled={!notifications.enabled}
              trackColor={{ false: colors.border, true: colors.accentPrimary }}
              thumbColor={
                Platform.OS === "ios" ? "#FFFFFF" : colors.bgSecondary
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <TrendingUp size={20} color={colors.textMuted} />
              <View>
                <Text style={styles.settingLabel}>Weekly Progress Summary</Text>
                <Text style={styles.settingSubtext}>
                  Sunday evening recap of your week
                </Text>
              </View>
            </View>
            <Switch
              value={notifications.weeklyProgressSummary}
              onValueChange={handleToggleWeeklySummary}
              disabled={!notifications.enabled}
              trackColor={{ false: colors.border, true: colors.accentPrimary }}
              thumbColor={
                Platform.OS === "ios" ? "#FFFFFF" : colors.bgSecondary
              }
            />
          </View>
        </View>

        {/* Rest Timer Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rest Timer Feedback</Text>
          <Text style={styles.sectionSubtitle}>
            Alert you when rest timer completes during workouts
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Vibrate size={20} color={colors.textMuted} />
              <Text style={styles.settingLabel}>Vibration</Text>
            </View>
            <Switch
              value={notifications.restTimerVibration}
              onValueChange={(v) =>
                setRestTimerFeedback(v, notifications.restTimerSound)
              }
              trackColor={{ false: colors.border, true: colors.accentPrimary }}
              thumbColor={
                Platform.OS === "ios" ? "#FFFFFF" : colors.bgSecondary
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Volume2 size={20} color={colors.textMuted} />
              <Text style={styles.settingLabel}>Sound</Text>
            </View>
            <Switch
              value={notifications.restTimerSound}
              onValueChange={(v) =>
                setRestTimerFeedback(notifications.restTimerVibration, v)
              }
              trackColor={{ false: colors.border, true: colors.accentPrimary }}
              thumbColor={
                Platform.OS === "ios" ? "#FFFFFF" : colors.bgSecondary
              }
            />
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Bottom Sheet */}
      <BottomSheet
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title="Select Reminder Time"
      >
        <View style={styles.timePickerContent}>
          <View style={styles.pickerRow}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollPicker
                value={tempHour}
                onValueChange={setTempHour}
                min={0}
                max={23}
                step={1}
              />
            </View>
            <Text style={styles.pickerSeparator}>:</Text>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <ScrollPicker
                value={tempMinute}
                onValueChange={setTempMinute}
                min={0}
                max={59}
                step={5}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleTimeConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bgPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: themeColors.textPrimary,
  },
  permissionWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColors.accentWarning + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.accentWarning + "40",
    gap: spacing.md,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    ...typography.body,
    fontWeight: "600",
    color: themeColors.accentWarning,
  },
  permissionSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: themeColors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: "700",
    color: themeColors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: spacing.md,
  },
  mainToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mainToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.accentPrimary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  mainToggleTitle: {
    ...typography.body,
    fontWeight: "600",
    color: themeColors.textPrimary,
  },
  mainToggleSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: themeColors.border,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: themeColors.textPrimary,
  },
  settingSubtext: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: themeColors.border,
  },
  timePickerLabel: {
    ...typography.body,
    color: themeColors.textPrimary,
  },
  timePickerValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timePickerText: {
    ...typography.body,
    color: themeColors.accentPrimary,
    fontWeight: "600",
  },
  daysContainer: {
    paddingTop: spacing.md,
  },
  daysLabel: {
    ...typography.body,
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  daysSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: spacing.md,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  dayPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.bgPrimary,
    alignItems: "center",
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  dayPillActive: {
    backgroundColor: themeColors.accentPrimary,
    borderColor: themeColors.accentPrimary,
  },
  dayPillText: {
    ...typography.caption,
    fontWeight: "600",
    color: themeColors.textSecondary,
  },
  dayPillTextActive: {
    color: themeColors.bgPrimary,
  },
  timePickerContent: {
    padding: spacing.lg,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pickerColumn: {
    alignItems: "center",
  },
  pickerLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: spacing.sm,
  },
  pickerSeparator: {
    fontSize: 32,
    fontWeight: "700",
    color: themeColors.textPrimary,
    marginTop: spacing.lg,
  },
  confirmButton: {
    backgroundColor: themeColors.accentPrimary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  confirmButtonText: {
    ...typography.body,
    fontWeight: "600",
    color: themeColors.bgPrimary,
  },
});
