import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  User,
  Bell,
  Moon,
  Sun,
  Scale,
  Target,
  HelpCircle,
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Cloud,
  CloudOff,
  Trash2,
  Mail,
  Shield,
  Smartphone,
} from "lucide-react-native";
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  Layout 
} from "react-native-reanimated";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import { useSettingsStore } from "../../src/stores/settingsStore";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { useAuthStore } from "../../src/stores/authStore";
import { useMeasurementStore } from "../../src/stores/measurementStore";
import { useProgressStore } from "../../src/stores/progressStore";
import { useExerciseStore } from "../../src/stores/exerciseStore";
import {
  BottomSheet,
  OptionItem,
  ConfirmModal,
  InfoModal,
} from "../../src/components/ui/BottomSheet";
import { showToast } from "../../src/components/ui";
import {
  resetWorkoutData,
  getRecentSessions,
  clearAllSampleData,
  cleanupDeletedRecords,
} from "../../src/services/database";
import {
  exportBackup,
  importBackup,
  getLastBackupTime,
  getSyncStatus,
  type SyncStatus,
} from "../../src/services/backup";

function SettingsItem({
  icon: Icon,
  label,
  value,
  onPress,
  isLast = false,
  showChevron = true,
  color,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  showChevron?: boolean;
  color?: string;
}) {
  const themeColors = useColors(); // Use dynamic theme colors
  const styles = useMemo(() => createStyles(themeColors), [themeColors]); // Dynamic styles
  
  return (
    <>
      <TouchableOpacity
        style={styles.settingsItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.settingsItemLeft}>
          <View style={styles.icon}>
            <Icon size={24} color={color || themeColors.textPrimary} />
          </View>
          <Text style={[styles.settingsItemLabel, { color: themeColors.textPrimary }]}>{label}</Text>
        </View>
        <View style={styles.settingsItemRight}>
          {value && <Text style={[styles.settingsItemValue, { color: themeColors.textSecondary }]}>{value}</Text>}
          {showChevron && <ChevronRight size={18} color={themeColors.textMuted} />}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={[styles.settingsItemBorder, { backgroundColor: themeColors.border + "30" }]} />}
    </>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const themeColors = useColors(); // Dynamic theme colors
  const styles = useMemo(() => createStyles(themeColors), [themeColors]); // Dynamic styles
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const setPreferredUnit = useSettingsStore((state) => state.setPreferredUnit);
  const weeklyGoal = useSettingsStore((state) => state.weeklyGoal);
  const setWeeklyGoal = useSettingsStore((state) => state.setWeeklyGoal);
  const setRecentSessions = useWorkoutStore((state) => state.setRecentSessions);
  const recentSessions = useWorkoutStore((state) => state.recentSessions);
  const templates = useWorkoutStore((state) => state.templates);
  const measurements = useMeasurementStore((state) => state.measurements);
  const personalRecords = useProgressStore((state) => state.personalRecords);
  const exercises = useExerciseStore((state) => state.exercises);

  // Auth state
  const {
    user,
    profile,
    isAuthenticated,
    isSyncing,
    lastSyncedAt,
    syncData,
    signOut: authSignOut,
  } = useAuthStore();

  // Modal states
  const [showUnitsSheet, setShowUnitsSheet] = useState(false);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteSyntheticConfirm, setShowDeleteSyntheticConfirm] =
    useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({
    title: "",
    message: "",
  });

  // Backup & Sync states
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showBackupSheet, setShowBackupSheet] = useState(false);

  // Load backup/sync status on mount
  useEffect(() => {
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    const [backup, status] = await Promise.all([
      getLastBackupTime(),
      getSyncStatus(),
    ]);
    setLastBackup(backup);
    setSyncStatus(status);
  };

  const handleSelectUnit = (unit: "lbs" | "kg") => {
    setPreferredUnit(unit);
    setShowUnitsSheet(false);
  };

  const handleSelectGoal = (goal: number) => {
    setWeeklyGoal(goal);
    setShowGoalSheet(false);
  };

  const handleSelectTheme = (selectedTheme: "dark" | "light") => {
    setTheme(selectedTheme);
    setShowThemeSheet(false);
  };

  const handleComingSoon = (feature: string) => {
    setInfoModalContent({
      title: "Coming Soon",
      message: `${feature} will be available in a future update.`,
    });
    setShowInfoModal(true);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    const result = await exportBackup();
    setIsExporting(false);

    if (result.success) {
      await loadBackupStatus();
      setInfoModalContent({
        title: "Backup Exported",
        message:
          "Your fitness data has been exported successfully. Save this file somewhere safe!",
      });
    } else {
      setInfoModalContent({
        title: "Export Failed",
        message: result.error || "Failed to export backup. Please try again.",
      });
    }
    setShowBackupSheet(false);
    setShowInfoModal(true);
  };

  const handleImportBackup = async () => {
    setIsImporting(true);
    const result = await importBackup();
    setIsImporting(false);

    if (result.success && result.stats) {
      await loadBackupStatus();
      // Reload sessions to reflect imported data
      const sessions = await getRecentSessions();
      setRecentSessions(sessions);
      setInfoModalContent({
        title: "Backup Imported",
        message: `Successfully imported:\n• ${result.stats.sessions} workout sessions\n• ${result.stats.measurements} body measurements\n• ${result.stats.personalRecords} personal records\n\nRestart the app to see all changes.`,
      });
    } else {
      setInfoModalContent({
        title: "Import Failed",
        message:
          result.error ||
          "Failed to import backup. Make sure you selected a valid backup file.",
      });
    }
    setShowBackupSheet(false);
    setShowInfoModal(true);
  };

  const handleSyncToCloud = async () => {
    if (!isAuthenticated) {
      setShowBackupSheet(false);
      router.push("/login");
      return;
    }

    // Use the robust sync service instead of manual auth store sync
    // This ensures consistency with app startup sync and handles deletions correctly
    const { performFullSync } = require("../../src/services/syncService");
    
    // Show syncing state
    // We don't have direct access to setSyncing from here for the global state,
    // but performFullSync updates the global sync status which the UI observes
    
    try {
      const result = await performFullSync();

      if (result.success) {
        await loadBackupStatus();
        setInfoModalContent({
          title: "Sync Complete",
          message: `Your data has been synced successfully.\n\n• ${
            result.uploaded || 0
          } items uploaded\n• ${
            result.downloaded || 0
          } items downloaded\n• ${
            result.conflicts || 0
          } conflicts resolved`,
        });
      } else {
        setInfoModalContent({
          title: "Sync Failed",
          message: result.error || "Failed to sync data. Please try again.",
        });
      }
    } catch (error: any) {
        setInfoModalContent({
          title: "Sync Error",
          message: error.message || "An unexpected error occurred during sync.",
        });
    }
    
    setShowBackupSheet(false);
    setShowInfoModal(true);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    if (isAuthenticated) {
      const result = await authSignOut();
      if (result.success) {
        showToast({ type: "success", title: "Signed out successfully" });
      } else {
        showToast({
          type: "error",
          title: result.error || "Failed to sign out",
        });
      }
    } else {
      handleComingSoon("Account features");
    }
  };

  const handleResetData = async () => {
    try {
      await resetWorkoutData();
      const sessions = await getRecentSessions();
      setRecentSessions(sessions);
      setShowResetConfirm(false);
      setInfoModalContent({
        title: "Data Reset",
        message:
          "Sample workout data has been reset for Oct-Dec 2025.",
      });
      setShowInfoModal(true);
    } catch (error) {
      console.error("Failed to reset data:", error);
      setShowResetConfirm(false);
      setInfoModalContent({
        title: "Error",
        message: "Failed to reset data. Please try again.",
      });
      setShowInfoModal(true);
    }
  };

  const handleClearSampleData = async () => {
    try {
      const { performFullSync } = require("../../src/services/syncService");
      const result = await clearAllSampleData();
      const sessions = await getRecentSessions();
      setRecentSessions(sessions);
      setShowDeleteSyntheticConfirm(false);
      setInfoModalContent({
        title: "Old Data Cleared",
        message:
          result.deletedCount > 0
            ? `Deleted ${result.deletedCount} workout${
                result.deletedCount !== 1 ? "s" : ""
              } from before January 2026.`
            : "No old workouts found to delete.",
      });
      setShowInfoModal(true);

      // Trigger sync to push deletions to cloud
      console.log("[Settings] Triggering sync to propagate deletions...");
      performFullSync().then((syncResult: any) => {
        if (syncResult.success) {
           console.log("[Settings] Deletions synced to cloud");
           loadBackupStatus();
        } else {
           console.warn("[Settings] Failed to sync deletions:", syncResult.error);
        }
      });
    } catch (error) {
      console.error("Failed to clear old data:", error);
      setShowDeleteSyntheticConfirm(false);
      setInfoModalContent({
        title: "Error",
        message: "Failed to clear old data. Please try again.",
      });
      setShowInfoModal(true);
    }
  };

  const unitOptions = [
    { value: "lbs" as const, label: "Pounds (LBS)" },
    { value: "kg" as const, label: "Kilograms (KG)" },
  ];

  const goalOptions = [
    { value: 2, label: "2 days per week" },
    { value: 3, label: "3 days per week" },
    { value: 4, label: "4 days per week" },
    { value: 5, label: "5 days per week" },
    { value: 6, label: "6 days per week" },
    { value: 7, label: "7 days per week" },
  ];

  return (
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: themeColors.bgPrimary }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      >
        {/* Profile Section */}
        {isAuthenticated && user ? (
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={[styles.profileSection, { backgroundColor: themeColors.bgSecondary }]}
          >
            <View style={[styles.profileAvatar, { backgroundColor: themeColors.bgTertiary }]}>
              <User size={32} color={themeColors.textPrimary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: themeColors.textPrimary }]}>
                {profile?.displayName || user.displayName || "Fitness User"}
              </Text>
              <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>{user.email}</Text>
              {lastSyncedAt && (
                <Text style={[styles.lastSyncText, { color: themeColors.textMuted }]}>
                  Last synced: {formatDate(lastSyncedAt)}
                </Text>
              )}
            </View>
          </Animated.View>
        ) : (
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
          >
          <TouchableOpacity
            style={[styles.signInBanner, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.accentPrimary + "40" }]}
            onPress={() => router.push("/login")}
          >
            <View style={styles.signInBannerContent}>
              <Cloud size={24} color={themeColors.accentPrimary} />
              <View style={styles.signInBannerText}>
                <Text style={[styles.signInBannerTitle, { color: themeColors.textPrimary }]}>
                  Sign in to sync your data
                </Text>
                <Text style={[styles.signInBannerSubtitle, { color: themeColors.textSecondary }]}>
                  Access workouts from any device
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={themeColors.textMuted} />
          </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Account</Text>
          <View style={[styles.sectionContent, { backgroundColor: themeColors.bgSecondary }]}>
            {isAuthenticated ? (
              <>
                <SettingsItem
                  icon={User}
                  label="Profile"
                  value={profile?.displayName || "Edit"}
                  onPress={() => router.push("/profile")}
                  color={colors.accentPrimary}
                />
                <SettingsItem
                  icon={Shield}
                  label="Account Security"
                  onPress={() => router.push("/account-security")}
                  color={colors.accentPrimary}
                />
              </>
            ) : (
              <>
                <SettingsItem
                  icon={User}
                  label="Sign Up"
                  onPress={() => router.push("/signup")}
                  color={colors.accentPrimary}
                />
                <SettingsItem
                  icon={Mail}
                  label="Sign In"
                  onPress={() => router.push("/login")}
                  color={colors.accentPrimary}
                />
              </>
            )}
            <SettingsItem
              icon={Bell}
              label="Notifications"
              onPress={() => router.push("/notification-settings")}
              color={colors.accentPrimary}
              isLast
            />
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Preferences</Text>
          <View style={[styles.sectionContent, { backgroundColor: themeColors.bgSecondary }]}>
            <SettingsItem
              icon={Scale}
              label="Units"
              value={preferredUnit.toUpperCase()}
              onPress={() => setShowUnitsSheet(true)}
              color={themeColors.accentPrimary}
            />
            <SettingsItem
              icon={theme === "dark" ? Moon : Sun}
              label="Theme"
              value={theme === "dark" ? "Dark" : "Light"}
              onPress={() => setShowThemeSheet(true)}
              color={themeColors.accentPrimary}
            />
            <SettingsItem
              icon={Target}
              label="Weekly Goal"
              value={`${weeklyGoal} days`}
              onPress={() => setShowGoalSheet(true)}
              color={themeColors.accentPrimary}
              isLast
            />
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Backup & Sync</Text>
          <View style={[styles.sectionContent, { backgroundColor: themeColors.bgSecondary }]}>
            <SettingsItem
              icon={isAuthenticated && lastSyncedAt ? Cloud : CloudOff}
              label="Cloud Sync"
              value={
                isAuthenticated
                  ? lastSyncedAt
                    ? formatDate(lastSyncedAt)
                    : "Not synced"
                  : "Sign in to sync"
              }
              onPress={() => setShowBackupSheet(true)}
              color={themeColors.accentPrimary}
            />
            <SettingsItem
              icon={Download}
              label="Export Backup"
              value={lastBackup ? formatDate(lastBackup) : "Never"}
              onPress={handleExportBackup}
              color={themeColors.accentPrimary}
            />
            <SettingsItem
              icon={Upload}
              label="Import Backup"
              onPress={() => handleImportBackup}
              color={themeColors.accentPrimary}
              isLast
            />
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Support</Text>
          <View style={[styles.sectionContent, { backgroundColor: themeColors.bgSecondary }]}>
            <SettingsItem
              icon={HelpCircle}
              label="Help & FAQ"
              onPress={() => handleComingSoon("Help & FAQ")}
              color={themeColors.accentPrimary}
            />
            <SettingsItem
              icon={RefreshCw}
              label="Create Sample Data"
              onPress={() => setShowResetConfirm(true)}
              color={themeColors.accentWarning}
            />
            <SettingsItem
              icon={Trash2}
              label="Clear Sample Data"
              onPress={() => setShowDeleteSyntheticConfirm(true)}
              color={themeColors.accentDanger}
              isLast
            />
          </View>
        </Animated.View>

        {isAuthenticated && (
          <Animated.View
            entering={FadeInDown.delay(600).springify()}
          >
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: themeColors.bgSecondary }]}
              activeOpacity={0.7}
              onPress={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={20} color={themeColors.accentDanger} />
              <Text style={[styles.logoutText, { color: themeColors.accentDanger }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        )}



        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Units Bottom Sheet */}
      <BottomSheet
        visible={showUnitsSheet}
        onClose={() => setShowUnitsSheet(false)}
        title="Select Unit"
      >
        {unitOptions.map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={preferredUnit === option.value}
            onPress={() => handleSelectUnit(option.value)}
          />
        ))}
      </BottomSheet>

      {/* Weekly Goal Bottom Sheet */}
      <BottomSheet
        visible={showGoalSheet}
        onClose={() => setShowGoalSheet(false)}
        title="Weekly Goal"
      >
        {goalOptions.map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={weeklyGoal === option.value}
            onPress={() => handleSelectGoal(option.value)}
          />
        ))}
      </BottomSheet>

      {/* Theme Bottom Sheet */}
      <BottomSheet
        visible={showThemeSheet}
        onClose={() => setShowThemeSheet(false)}
        title="Select Theme"
      >
        <OptionItem
          label="Dark Mode"
          selected={theme === "dark"}
          onPress={() => handleSelectTheme("dark")}
        />
        <OptionItem
          label="Light Mode"
          selected={theme === "light"}
          onPress={() => handleSelectTheme("light")}
        />
      </BottomSheet>

      {/* Reset Data Confirmation */}
      <ConfirmModal
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetData}
        title="Create Sample Data"
        message="This will generate fake demo workouts (Oct-Dec 2025) to preview app features. Use this only for testing."
        confirmText="Generate Sample Data"
        centered
      />

      {/* Clear Sample Data Confirmation */}
      <ConfirmModal
        visible={showDeleteSyntheticConfirm}
        onClose={() => setShowDeleteSyntheticConfirm(false)}
        onConfirm={handleClearSampleData}
        title="Clear Sample Data"
        message="This will DELETE only the sample workouts from October-December 2025. Your real workouts from January 2026 onwards will be preserved."
        confirmText="Clear Sample Data"
        destructive
      />

      {/* Logout Confirmation */}
      <ConfirmModal
        visible={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out? Your local data will be preserved."
        confirmText="Sign Out"
        cancelText="Cancel"
        destructive
      />

      {/* Info Modal (Coming Soon) */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={infoModalContent.title}
        message={infoModalContent.message}
      />

      {/* Cloud Sync Bottom Sheet */}
      <BottomSheet
        visible={showBackupSheet}
        onClose={() => setShowBackupSheet(false)}
        title="Cloud Sync"
      >
        <View style={styles.backupSheetContent}>
          {isAuthenticated ? (
            <>
              {lastSyncedAt ? (
                <View style={styles.cloudStatus}>
                  <Cloud size={32} color={colors.accentSecondary} />
                  <Text style={styles.cloudStatusText}>Synced with cloud</Text>
                  <Text style={styles.cloudStatusSubtext}>
                    Last synced: {formatDate(lastSyncedAt)}
                  </Text>
                  <Text style={styles.cloudStatusDetails}>
                    {recentSessions.length} workouts • {measurements.length}{" "}
                    measurements
                  </Text>
                </View>
              ) : (
                <View style={styles.cloudStatus}>
                  <CloudOff size={32} color={colors.textMuted} />
                  <Text style={styles.cloudStatusText}>Not synced yet</Text>
                  <Text style={styles.cloudStatusSubtext}>
                    Sync your data to keep it safe
                  </Text>
                </View>
              )}

              <View style={styles.backupActions}>
                <TouchableOpacity
                  style={[styles.backupActionButton, styles.syncButton]}
                  onPress={handleSyncToCloud}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                      size="small"
                    />
                  ) : (
                    <>
                      <Cloud size={20} color="#FFFFFF" />
                      <Text style={[styles.backupActionText, { color: "#FFFFFF" }]}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.cloudStatus}>
              <CloudOff size={32} color={colors.textMuted} />
              <Text style={styles.cloudStatusText}>Sign in to sync</Text>
              <Text style={styles.cloudStatusSubtext}>
                Create an account to sync your data across devices
              </Text>
              <TouchableOpacity
                style={[
                  styles.backupActionButton,
                  styles.syncButton,
                  { marginTop: spacing.lg },
                ]}
                onPress={() => {
                  setShowBackupSheet(false);
                  router.push("/login");
                }}
              >
                <User size={20} color="#FFFFFF" />
                <Text style={[styles.backupActionText, { color: "#FFFFFF" }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BottomSheet>
    </>
  );
}

// Dynamic styles creator - takes colors parameter for theming
const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  profileName: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lastSyncText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  signInBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.accentPrimary + "40",
  },
  signInBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  signInBannerText: {
    marginLeft: spacing.md,
  },
  signInBannerTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  signInBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
  sectionContent: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 64,
  },
  settingsItemBorder: {
    height: 1,
    backgroundColor: colors.border + "30",
    marginLeft: 56,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: spacing.lg,
  },
  settingsItemLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    marginTop: spacing.xxl,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
  },
  logoutText: {
    ...typography.body,
    color: colors.accentDanger,
    marginLeft: spacing.sm,
  },
  bottomPadding: {
    height: 100,
  },
  backupSheetContent: {
    padding: spacing.lg,
  },
  cloudStatus: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  cloudStatusText: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  cloudStatusSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  cloudStatusDetails: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  backupActions: {
    gap: spacing.md,
  },
  backupActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgTertiary,
  },
  syncButton: {
    backgroundColor: colors.accentPrimary,
  },
  backupActionText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
});

