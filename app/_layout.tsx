import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  initDatabase,
  getAllExercises,
  getAllTemplates,
  getRecentSessions,
  getPersonalRecords,
} from "../src/services/database";
import { useExerciseStore } from "../src/stores/exerciseStore";
import { useWorkoutStore } from "../src/stores/workoutStore";
import { useProgressStore } from "../src/stores/progressStore";
import { useAuthStore } from "../src/stores/authStore";
import { ThemeProvider, useColors, useThemeName } from "../src/contexts/ThemeContext";
import { ErrorBoundary, ToastContainer, showToast, NetworkStatusProvider } from "../src/components/ui";
import {
  startNetworkListener,
  downloadAndMergeCloudData,
  performFullSync,
} from "../src/services/syncService";

// Inner component that uses theme
function AppContent() {
  const colors = useColors();
  const themeName = useThemeName();
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const setExercises = useExerciseStore((state) => state.setExercises);
  const setTemplates = useWorkoutStore((state) => state.setTemplates);
  const setRecentSessions = useWorkoutStore((state) => state.setRecentSessions);
  const setPersonalRecords = useProgressStore(
    (state) => state.setPersonalRecords
  );
  const loadActiveWorkout = useWorkoutStore((state) => state.loadActiveWorkout);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize Firebase auth
        await initializeAuth();

        // Initialize database
        await initDatabase();

        // Load all data into stores
        // Load all data into stores sequentially to avoid SQLite concurrency issues
        const exercises = await getAllExercises();
        setExercises(exercises);

        const templates = await getAllTemplates();
        setTemplates(templates);

        const sessions = await getRecentSessions();
        setRecentSessions(sessions);

        const records = await getPersonalRecords();
        setPersonalRecords(records);

        // Load active workout if one exists
        await loadActiveWorkout();

        // Start network listener for auto-sync
        startNetworkListener();

        // Network listener started

      } catch (error) {
        console.error("Failed to initialize app:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setInitError(errorMessage);

        // Show error toast after a brief delay to ensure toast container is mounted
        setTimeout(() => {
          showToast({
            type: "error",
            title: "Initialization Error",
            message:
              "Failed to load app data. Some features may not work correctly.",
            duration: 6000,
          });
        }, 500);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // Sync data when user becomes authenticated and app is initialized
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log("[Sync] User is logged in, triggering sync...");
      performFullSync().then((result) => {
        if (result.success) {
          console.log(`[Sync] Synced: ${result.uploaded} up, ${result.downloaded} down, ${result.conflicts} conflicts`);
          if (result.downloaded > 0) {
            showToast({
              type: "success",
              title: "Data Synced",
              message: `Downloaded ${result.downloaded} items from cloud`,
              duration: 3000,
            });
            // Reload ALL data from database after sync (including templates and exercises)
            Promise.all([
              getAllExercises(),
              getAllTemplates(),
              getRecentSessions(),
              getPersonalRecords(),
            ]).then(([exercises, templates, sessions, records]) => {
              setExercises(exercises);
              setTemplates(templates);
              setRecentSessions(sessions);
              setPersonalRecords(records);
              console.log(`[Sync] Reloaded: ${exercises.length} exercises, ${templates.length} templates, ${sessions.length} sessions`);
            });
          }
        }
      }).catch(err => {
        console.error("[Sync] Initial sync failed:", err);
      });
    }
  }, [isLoading, isAuthenticated, user?.uid]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error("Global error boundary caught:", error);
        // Could send to Sentry, Bugsnag, etc. here
      }}
    >
      <NetworkStatusProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.bgPrimary,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: "600",
            },
            contentStyle: {
              backgroundColor: colors.bgPrimary,
            },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="workout/[id]"
            options={{
              title: "Workout",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="workout/exercise/[id]"
            options={{
              title: "Exercise",
              headerBackTitle: "Back",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="workout/complete"
            options={{
              title: "Workout Complete",
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="signup"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="notification-settings"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="account-security"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
        <ToastContainer />
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
        </GestureHandlerRootView>
      </NetworkStatusProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
