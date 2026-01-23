import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  documentDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import {
  getAllExercises,
  getAllTemplates,
  getRecentSessions,
  getPersonalRecords,
} from "./database";
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  PersonalRecord,
  BodyMeasurement,
} from "../types";

// Backup data structure
export interface BackupData {
  version: string;
  exportedAt: string;
  settings: {
    preferredUnit: "lbs" | "kg";
    weeklyGoal: number;
    defaultRestTime: number;
  };
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  personalRecords: PersonalRecord[];
  measurements: BodyMeasurement[];
}

// Cloud sync status
export interface SyncStatus {
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: number;
}

const BACKUP_VERSION = "1.0.0";
const SYNC_STATUS_KEY = "fitness-sync-status";
const LAST_BACKUP_KEY = "fitness-last-backup";

/**
 * Collect all app data for backup
 */
export const collectBackupData = async (): Promise<BackupData> => {
  // Get settings from AsyncStorage
  const settingsRaw = await AsyncStorage.getItem("fitness-settings-storage");
  const settings = settingsRaw
    ? JSON.parse(settingsRaw).state
    : { preferredUnit: "lbs", weeklyGoal: 4, defaultRestTime: 90 };

  // Get measurements from AsyncStorage
  const measurementsRaw = await AsyncStorage.getItem(
    "fitness-measurements-storage"
  );
  const measurements = measurementsRaw
    ? JSON.parse(measurementsRaw).state.measurements || []
    : [];

  // Get database data
  const exercises = await getAllExercises();
  const templates = await getAllTemplates();
  const sessions = await getRecentSessions(1000); // Get all sessions
  const personalRecords = await getPersonalRecords();

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    exercises: exercises.filter((e) => e.isCustom), // Only custom exercises
    templates: templates.filter((t) => !t.isPreset), // Only custom templates
    sessions,
    personalRecords,
    measurements,
  };
};

/**
 * Export backup to a JSON file and share it
 */
export const exportBackup = async (): Promise<{
  success: boolean;
  error?: string;
  filePath?: string;
}> => {
  try {
    const backupData = await collectBackupData();
    const jsonString = JSON.stringify(backupData, null, 2);

    if (Platform.OS === "web") {
      // Web: Create a download link
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fitness-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      return { success: true };
    }

    // Native: Save to file and share using legacy expo-file-system API
    const fileName = `fitness-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    const filePath = `${documentDirectory}${fileName}`;

    // Write the JSON string to the file
    await writeAsStringAsync(filePath, jsonString, {
      encoding: EncodingType.UTF8,
    });

    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());

    // Check if sharing is available
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: "application/json",
        dialogTitle: "Export Fitness Data",
      });
    }

    return { success: true, filePath };
  } catch (error) {
    console.error("Export backup failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export backup",
    };
  }
};

/**
 * Import backup from a JSON file
 */
export const importBackup = async (): Promise<{
  success: boolean;
  error?: string;
  data?: BackupData;
  stats?: {
    sessions: number;
    measurements: number;
    personalRecords: number;
  };
}> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: "No file selected" };
    }

    const fileUri = result.assets[0].uri;
    let jsonString: string;

    if (Platform.OS === "web") {
      // Web: Read file using fetch
      const response = await fetch(fileUri);
      jsonString = await response.text();
    } else {
      // Native: Read file using legacy expo-file-system API
      jsonString = await readAsStringAsync(fileUri, {
        encoding: EncodingType.UTF8,
      });
    }

    const backupData: BackupData = JSON.parse(jsonString);

    // Validate backup structure
    if (!backupData.version || !backupData.exportedAt) {
      return { success: false, error: "Invalid backup file format" };
    }

    // Import settings
    if (backupData.settings) {
      const currentSettings = await AsyncStorage.getItem(
        "fitness-settings-storage"
      );
      const parsed = currentSettings
        ? JSON.parse(currentSettings)
        : { state: {}, version: 0 };
      parsed.state = { ...parsed.state, ...backupData.settings };
      await AsyncStorage.setItem(
        "fitness-settings-storage",
        JSON.stringify(parsed)
      );
    }

    // Import measurements
    if (backupData.measurements && backupData.measurements.length > 0) {
      const currentMeasurements = await AsyncStorage.getItem(
        "fitness-measurements-storage"
      );
      const parsed = currentMeasurements
        ? JSON.parse(currentMeasurements)
        : { state: { measurements: [] }, version: 0 };

      // Merge measurements (avoid duplicates by ID)
      const existingIds = new Set(
        parsed.state.measurements.map((m: BodyMeasurement) => m.id)
      );
      const newMeasurements = backupData.measurements.filter(
        (m) => !existingIds.has(m.id)
      );
      parsed.state.measurements = [
        ...parsed.state.measurements,
        ...newMeasurements,
      ];

      await AsyncStorage.setItem(
        "fitness-measurements-storage",
        JSON.stringify(parsed)
      );
    }

    // Note: Importing sessions, exercises, and templates would require database operations
    // which would need to be implemented based on specific requirements
    // For now, we'll return the data for the caller to handle

    return {
      success: true,
      data: backupData,
      stats: {
        sessions: backupData.sessions?.length || 0,
        measurements: backupData.measurements?.length || 0,
        personalRecords: backupData.personalRecords?.length || 0,
      },
    };
  } catch (error) {
    console.error("Import backup failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import backup",
    };
  }
};

/**
 * Get last backup timestamp
 */
export const getLastBackupTime = async (): Promise<Date | null> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    return timestamp ? new Date(timestamp) : null;
  } catch {
    return null;
  }
};

/**
 * Get current sync status
 */
export const getSyncStatus = async (): Promise<SyncStatus> => {
  try {
    const status = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (status) {
      const parsed = JSON.parse(status);
      return {
        ...parsed,
        lastSyncedAt: parsed.lastSyncedAt
          ? new Date(parsed.lastSyncedAt)
          : null,
      };
    }
  } catch (error) {
    console.error("Failed to get sync status:", error);
  }

  return {
    lastSyncedAt: null,
    isSyncing: false,
    syncError: null,
    pendingChanges: 0,
  };
};
