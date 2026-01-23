import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Storage keys
const NOTIFICATION_SETTINGS_KEY = "fitness-notification-settings";
const SCHEDULED_NOTIFICATIONS_KEY = "fitness-scheduled-notifications";

// Check if running in Expo Go (limited notification support in SDK 53+)
// Must check BEFORE importing expo-notifications
const isExpoGo = Constants.appOwnership === "expo";

// Lazy-loaded notifications module (only loaded in dev builds)
let Notifications: typeof import("expo-notifications") | null = null;

// Initialize notifications module (only in dev builds)
const getNotifications = async () => {
  if (isExpoGo) {
    return null;
  }
  if (!Notifications) {
    Notifications = await import("expo-notifications");
    // Set up notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return Notifications;
};

// Initialize on module load for dev builds
if (!isExpoGo) {
  getNotifications().catch(console.error);
}

export interface NotificationSettings {
  enabled: boolean;
  workoutReminders: {
    enabled: boolean;
    time: string; // "HH:MM" format
    days: number[]; // 0-6 for Sun-Sat
  };
  restDayReminders: boolean;
  weeklyProgressSummary: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  enabled: false,
  workoutReminders: {
    enabled: false,
    time: "09:00",
    days: [1, 3, 5], // Mon, Wed, Fri
  },
  restDayReminders: false,
  weeklyProgressSummary: false,
};

/**
 * Check if running in Expo Go (notifications limited)
 */
export const isRunningInExpoGo = (): boolean => isExpoGo;

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const notif = await getNotifications();
  if (!notif) {
    console.log("[Notifications] Skipped in Expo Go");
    return false;
  }

  try {
    const { status: existingStatus } = await notif.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await notif.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission denied");
      return false;
    }

    // Set up notification channel for Android
    if (Platform.OS === "android") {
      await notif.setNotificationChannelAsync("workout-reminders", {
        name: "Workout Reminders",
        importance: notif.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B35",
        sound: "default",
      });

      await notif.setNotificationChannelAsync("rest-timer", {
        name: "Rest Timer",
        importance: notif.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
        sound: "default",
      });

      await notif.setNotificationChannelAsync("progress", {
        name: "Progress Updates",
        importance: notif.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }

    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  const notif = await getNotifications();
  if (!notif) return false;

  try {
    const { status } = await notif.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    return false;
  }
};

/**
 * Save notification settings
 */
export const saveNotificationSettings = async (
  settings: NotificationSettings
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error("Error saving notification settings:", error);
  }
};

/**
 * Load notification settings
 */
export const loadNotificationSettings =
  async (): Promise<NotificationSettings> => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        return { ...defaultNotificationSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
    return defaultNotificationSettings;
  };

/**
 * Schedule workout reminder notifications
 */
export const scheduleWorkoutReminders = async (
  time: string, // "HH:MM"
  days: number[] // 0-6 for Sun-Sat
): Promise<string[]> => {
  const notif = await getNotifications();
  if (!notif) {
    console.log("[Notifications] Skipping workout reminders in Expo Go");
    return [];
  }

  try {
    // Cancel existing workout reminders first
    await cancelWorkoutReminders();

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledIds: string[] = [];

    for (const day of days) {
      const id = await notif.scheduleNotificationAsync({
        content: {
          title: "💪 Time to workout!",
          body: "Let's crush your fitness goals today!",
          sound: "default",
          data: { type: "workout-reminder" },
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day === 0 ? 1 : day + 1, // expo-notifications uses 1-7 (Sun=1)
          hour: hours,
          minute: minutes,
        },
      });
      scheduledIds.push(id);
    }

    // Store scheduled notification IDs
    await AsyncStorage.setItem(
      SCHEDULED_NOTIFICATIONS_KEY,
      JSON.stringify({ workoutReminders: scheduledIds })
    );

    return scheduledIds;
  } catch (error) {
    console.error("Error scheduling workout reminders:", error);
    return [];
  }
};

/**
 * Cancel all workout reminder notifications
 */
export const cancelWorkoutReminders = async (): Promise<void> => {
  const notif = await getNotifications();
  if (!notif) return;

  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (stored) {
      const { workoutReminders } = JSON.parse(stored);
      if (workoutReminders && Array.isArray(workoutReminders)) {
        for (const id of workoutReminders) {
          await notif.cancelScheduledNotificationAsync(id);
        }
      }
    }
  } catch (error) {
    console.error("Error canceling workout reminders:", error);
  }
};

/**
 * Schedule weekly progress summary notification (every Sunday at 6 PM)
 */
export const scheduleWeeklyProgressSummary = async (): Promise<
  string | null
> => {
  const notif = await getNotifications();
  if (!notif) {
    console.log("[Notifications] Skipping weekly summary in Expo Go");
    return null;
  }

  try {
    const id = await notif.scheduleNotificationAsync({
      content: {
        title: "📊 Weekly Progress Summary",
        body: "Check out how you did this week!",
        sound: "default",
        data: { type: "weekly-summary" },
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 18,
        minute: 0,
      },
    });
    return id;
  } catch (error) {
    console.error("Error scheduling weekly summary:", error);
    return null;
  }
};

/**
 * Cancel weekly progress summary notification
 */
export const cancelWeeklyProgressSummary = async (): Promise<void> => {
  const notif = await getNotifications();
  if (!notif) return;

  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.weeklySummary) {
        await notif.cancelScheduledNotificationAsync(data.weeklySummary);
      }
    }
  } catch (error) {
    console.error("Error canceling weekly summary:", error);
  }
};

/**
 * Send immediate rest timer completion notification
 */
export const sendRestTimerNotification = async (): Promise<void> => {
  const notif = await getNotifications();
  if (!notif) return;

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: "⏱️ Rest Complete!",
        body: "Time for your next set - let's go!",
        sound: "default",
        data: { type: "rest-timer" },
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    console.error("Error sending rest timer notification:", error);
  }
};

/**
 * Send workout completion notification
 */
export const sendWorkoutCompleteNotification = async (
  workoutName: string,
  duration: number, // in minutes
  exerciseCount: number
): Promise<void> => {
  const notif = await getNotifications();
  if (!notif) return;

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: "🎉 Workout Complete!",
        body: `Great job! You finished ${workoutName} - ${exerciseCount} exercises in ${duration} minutes.`,
        sound: "default",
        data: { type: "workout-complete" },
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    console.error("Error sending workout complete notification:", error);
  }
};

/**
 * Send personal record notification
 */
export const sendPRNotification = async (
  exerciseName: string,
  weight: number,
  unit: string
): Promise<void> => {
  const notif = await getNotifications();
  if (!notif) return;

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: "🏆 New Personal Record!",
        body: `You just hit ${weight} ${unit} on ${exerciseName}!`,
        sound: "default",
        data: { type: "personal-record" },
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    console.error("Error sending PR notification:", error);
  }
};

/**
 * Get all scheduled notifications (for debugging)
 */
export const getScheduledNotifications = async () => {
  const notif = await getNotifications();
  if (!notif) return [];

  try {
    return await notif.getAllScheduledNotificationsAsync();
  } catch (error) {
    return [];
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  const notif = await getNotifications();
  if (notif) {
    try {
      await notif.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      // Ignore errors
    }
  }
  await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
};

/**
 * Add notification response listener
 */
export const addNotificationResponseListener = (
  callback: (response: any) => void
) => {
  // For Expo Go, return dummy subscription
  if (isExpoGo) {
    return { remove: () => {} };
  }

  // Dynamic import for dev builds
  let subscription: { remove: () => void } = { remove: () => {} };
  getNotifications().then((notif) => {
    if (notif) {
      subscription = notif.addNotificationResponseReceivedListener(callback);
    }
  });

  return {
    remove: () => subscription.remove(),
  };
};

/**
 * Add notification received listener (foreground)
 */
export const addNotificationReceivedListener = (
  callback: (notification: any) => void
) => {
  // For Expo Go, return dummy subscription
  if (isExpoGo) {
    return { remove: () => {} };
  }

  // Dynamic import for dev builds
  let subscription: { remove: () => void } = { remove: () => {} };
  getNotifications().then((notif) => {
    if (notif) {
      subscription = notif.addNotificationReceivedListener(callback);
    }
  });

  return {
    remove: () => subscription.remove(),
  };
};
