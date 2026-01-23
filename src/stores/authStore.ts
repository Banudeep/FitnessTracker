import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  signUpWithEmail,
  signInWithEmail,
  signOut as authSignOut,
  resetPassword,
  getCurrentUserId,
  subscribeToAuthChanges,
  signInWithGoogle,
  signInWithApple,
  AuthUser,
} from "../services/auth";
import {
  initializeFirebase,
  getUserProfile,
  updateUserProfile,
  syncAllData,
  getCloudSessions,
  getCloudMeasurements,
  getCloudPersonalRecords,
  getCloudCustomExercises,
  getCloudTemplates,
  UserProfile,
  SyncResult,
} from "../services/firebase";

interface AuthState {
  // User state
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Sync state
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  pendingChanges: number;

  // Actions
  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  signInGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInApple: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Profile actions
  updateProfile: (
    updates: Partial<Omit<UserProfile, "id" | "email" | "createdAt">>
  ) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;

  // Sync actions
  syncData: (localData: {
    sessions: any[];
    measurements: any[];
    personalRecords: any[];
    customExercises: any[];
    customTemplates: any[];
  }) => Promise<SyncResult>;
  fetchCloudData: () => Promise<{
    sessions: any[];
    measurements: any[];
    personalRecords: any[];
    customExercises: any[];
    customTemplates: any[];
  } | null>;

  // Internal
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setPendingChanges: (count: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      pendingChanges: 0,

      initialize: async () => {
        try {
          set({ isLoading: true });

          // Initialize Firebase
          initializeFirebase();

          // Subscribe to auth state changes
          subscribeToAuthChanges(async (authUser) => {
            if (authUser) {
              set({ user: authUser, isAuthenticated: true });

              // Fetch user profile
              const profile = await getUserProfile(authUser.uid);
              if (profile) {
                set({ profile, lastSyncedAt: profile.lastSyncedAt });
              }
            } else {
              set({ user: null, profile: null, isAuthenticated: false });
            }
            set({ isLoading: false });
          });
        } catch (error) {
          console.error("Auth initialization failed:", error);
          set({ isLoading: false });
        }
      },

      signUp: async (email, password, displayName) => {
        set({ isLoading: true, syncError: null });
        try {
          const result = await signUpWithEmail(email, password, displayName);

          if (result.success && result.user) {
            set({
              user: result.user,
              profile: result.profile || null,
              isAuthenticated: true,
            });
          }

          set({ isLoading: false });
          return { success: result.success, error: result.error };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true, syncError: null });
        try {
          const result = await signInWithEmail(email, password);

          if (result.success && result.user) {
            set({
              user: result.user,
              profile: result.profile || null,
              isAuthenticated: true,
            });
          }

          set({ isLoading: false });
          return { success: result.success, error: result.error, errorCode: result.errorCode };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signInGoogle: async () => {
        set({ isLoading: true, syncError: null });
        try {
          const result = await signInWithGoogle();

          if (result.success && result.user) {
            set({
              user: result.user,
              profile: result.profile || null,
              isAuthenticated: true,
            });
          }

          set({ isLoading: false });
          return { success: result.success, error: result.error };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signInApple: async () => {
        set({ isLoading: true, syncError: null });
        try {
          const result = await signInWithApple();

          if (result.success && result.user) {
            set({
              user: result.user,
              profile: result.profile || null,
              isAuthenticated: true,
            });
          }

          set({ isLoading: false });
          return { success: result.success, error: result.error };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signOut: async () => {
        try {
          const result = await authSignOut();
          if (result.success) {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              lastSyncedAt: null,
              syncError: null,
              pendingChanges: 0,
            });
          }
          return result;
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      forgotPassword: async (email) => {
        try {
          const result = await resetPassword(email);
          return result;
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        try {
          await updateUserProfile(user.uid, updates);

          // Refresh local profile
          const profile = await getUserProfile(user.uid);
          if (profile) {
            set({ profile });
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            set({ profile, lastSyncedAt: profile.lastSyncedAt });
          }
        } catch (error) {
          console.error("Failed to refresh profile:", error);
        }
      },

      syncData: async (localData) => {
        const { user } = get();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        set({ isSyncing: true, syncError: null });

        try {
          const result = await syncAllData(user.uid, localData);

          if (result.success) {
            set({
              lastSyncedAt: new Date(),
              pendingChanges: 0,
            });
          } else {
            set({ syncError: result.error || "Sync failed" });
          }

          set({ isSyncing: false });
          return result;
        } catch (error: any) {
          set({ isSyncing: false, syncError: error.message });
          return { success: false, error: error.message };
        }
      },

      fetchCloudData: async () => {
        const { user } = get();
        if (!user) return null;

        try {
          const [
            sessions,
            measurements,
            personalRecords,
            customExercises,
            customTemplates,
          ] = await Promise.all([
            getCloudSessions(user.uid),
            getCloudMeasurements(user.uid),
            getCloudPersonalRecords(user.uid),
            getCloudCustomExercises(user.uid),
            getCloudTemplates(user.uid),
          ]);

          return {
            sessions,
            measurements,
            personalRecords,
            customExercises,
            customTemplates,
          };
        } catch (error) {
          console.error("Failed to fetch cloud data:", error);
          return null;
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      setSyncError: (syncError) => set({ syncError }),
      setPendingChanges: (pendingChanges) => set({ pendingChanges }),
    }),
    {
      name: "fitness-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist minimal auth state
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
