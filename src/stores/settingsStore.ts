import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface NotificationPreferences {
  enabled: boolean;
  workoutReminders: {
    enabled: boolean;
    time: string; // "HH:MM" format
    days: number[]; // 0-6 for Sun-Sat
  };
  restDayReminders: boolean;
  weeklyProgressSummary: boolean;
  restTimerVibration: boolean;
  restTimerSound: boolean;
}

interface SettingsState {
  // User preferences
  theme: "dark" | "light";
  preferredUnit: "lbs" | "kg";
  weeklyGoal: number;
  defaultRestTime: number; // in seconds

  // Notification preferences
  notifications: NotificationPreferences;

  // Actions
  setTheme: (theme: "dark" | "light") => void;
  setPreferredUnit: (unit: "lbs" | "kg") => void;
  setWeeklyGoal: (goal: number) => void;
  setDefaultRestTime: (seconds: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setWorkoutReminders: (
    enabled: boolean,
    time?: string,
    days?: number[]
  ) => void;
  setRestDayReminders: (enabled: boolean) => void;
  setWeeklyProgressSummary: (enabled: boolean) => void;
  setRestTimerFeedback: (vibration: boolean, sound: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      preferredUnit: "lbs",
      weeklyGoal: 4,
      defaultRestTime: 90,
      notifications: {
        enabled: false,
        workoutReminders: {
          enabled: false,
          time: "09:00",
          days: [1, 3, 5], // Mon, Wed, Fri
        },
        restDayReminders: false,
        weeklyProgressSummary: false,
        restTimerVibration: true,
        restTimerSound: true,
      },

      setTheme: (theme: "dark" | "light") => {
        set({ theme });
      },

      setPreferredUnit: (unit: "lbs" | "kg") => {
        set({ preferredUnit: unit });
      },

      setWeeklyGoal: (goal: number) => {
        set({ weeklyGoal: goal });
      },

      setDefaultRestTime: (seconds: number) => {
        set({ defaultRestTime: seconds });
      },

      setNotificationsEnabled: (enabled: boolean) => {
        set((state) => ({
          notifications: { ...state.notifications, enabled },
        }));
      },

      setWorkoutReminders: (
        enabled: boolean,
        time?: string,
        days?: number[]
      ) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            workoutReminders: {
              enabled,
              time: time ?? state.notifications.workoutReminders.time,
              days: days ?? state.notifications.workoutReminders.days,
            },
          },
        }));
      },

      setRestDayReminders: (enabled: boolean) => {
        set((state) => ({
          notifications: { ...state.notifications, restDayReminders: enabled },
        }));
      },

      setWeeklyProgressSummary: (enabled: boolean) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            weeklyProgressSummary: enabled,
          },
        }));
      },

      setRestTimerFeedback: (vibration: boolean, sound: boolean) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            restTimerVibration: vibration,
            restTimerSound: sound,
          },
        }));
      },
    }),
    {
      name: "fitness-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
