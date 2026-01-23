import {
  syncWorkoutSession,
  syncBodyMeasurement,
  syncPersonalRecord,
  getCloudSessions,
  getCloudMeasurements,
  getCloudPersonalRecords,
  getCloudCustomExercises,
  getCloudTemplates,
  syncCustomExercise,
  syncWorkoutTemplate,
  updateUserProfile,
  markCloudSessionAsDeleted,
  markCloudMeasurementAsDeleted,
  markCloudTemplateAsDeleted,
  markCloudCustomExerciseAsDeleted,
} from "./firebase";
import { getCurrentUserId } from "./auth";
import {
  getRecentSessions,
  saveWorkoutSession,
  getPersonalRecords,
  savePersonalRecord,
  getDeletedSessions,
  deleteWorkoutSession,
  hardDeleteLocalSession,
  markSessionSynced,
  markRecordSynced,
} from "./database";
import {
  getDeletedTemplates,
  hardDeleteLocalTemplate,
  saveTemplate,
  updateTemplate,
  getAllTemplates,
  getUnsyncedTemplates,
  markTemplateSynced,
  saveSyncedTemplate,
} from "./database/templateQueries";
import {
  getCustomExercisesForSync,
  getDeletedExercises,
  hardDeleteLocalExercise,
  markExerciseSynced,
  createExercise,
  updateExercise,
  getAllExercises,
  reviveExercise,
  saveCustomExercise,
} from "./database/exerciseQueries";
import type {
  WorkoutSession,
  BodyMeasurement,
  PersonalRecord,
  Exercise,
  WorkoutTemplate,
} from "../types";
import NetInfo from "@react-native-community/netinfo";

// ==================== SYNC STATUS ====================

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingUploads: number;
  error: string | null;
}

let syncStatus: SyncStatus = {
  isOnline: true,
  isSyncing: false,
  lastSyncedAt: null,
  pendingUploads: 0,
  error: null,
};

let syncListeners: ((status: SyncStatus) => void)[] = [];

export const getSyncStatus = (): SyncStatus => syncStatus;

export const subscribeSyncStatus = (
  listener: (status: SyncStatus) => void
): (() => void) => {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
};

const notifyListeners = () => {
  syncListeners.forEach((l) => l(syncStatus));
};

const updateSyncStatus = (updates: Partial<SyncStatus>) => {
  syncStatus = { ...syncStatus, ...updates };
  notifyListeners();
};

// ==================== AUTO-UPLOAD ON WORKOUT COMPLETION ====================

/**
 * Upload a single workout session to the cloud.
 * Called automatically after a workout is completed.
 */
export const uploadWorkoutSession = async (
  session: WorkoutSession
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.log("[Sync] No user logged in, skipping upload");
    return false;
  }

  // Check if online
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    console.log("[Sync] Offline, workout will be synced later");
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    updateSyncStatus({ isSyncing: true });
    await syncWorkoutSession(userId, session);
    updateSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date(),
    });
    console.log("[Sync] Workout uploaded successfully:", session.id);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to upload workout:", error);
    updateSyncStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : "Upload failed",
      pendingUploads: syncStatus.pendingUploads + 1,
    });
    return false;
  }
};

/**
 * Upload a body measurement to the cloud.
 */
export const uploadMeasurement = async (
  measurement: BodyMeasurement
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    await syncBodyMeasurement(userId, measurement);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to upload measurement:", error);
    return false;
  }
};

/**
 * Upload a personal record to the cloud.
 */
export const uploadPersonalRecord = async (
  record: PersonalRecord
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return false;

  try {
    await syncPersonalRecord(userId, record);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to upload PR:", error);
    return false;
  }
};

/**
 * Upload a workout template to the cloud.
 */
export const uploadWorkoutTemplate = async (
  template: WorkoutTemplate
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    await syncWorkoutTemplate(userId, template);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to upload template:", error);
    return false;
  }
};

/**
 * Sync template deletion to cloud.
 */
export const syncTemplateDeletion = async (
  templateId: string
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    await markCloudTemplateAsDeleted(userId, templateId);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to sync template deletion:", error);
    return false;
  }
};

/**
 * Sync session deletion to cloud.
 */
export const syncSessionDeletion = async (
  sessionId: string
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    const deletedAt = new Date();
    await markCloudSessionAsDeleted(userId, sessionId, deletedAt);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to sync session deletion:", error);
    return false;
  }
};

/**
 * Sync measurement deletion to cloud.
 */
export const syncMeasurementDeletion = async (
  measurementId: string
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    await markCloudMeasurementAsDeleted(userId, measurementId);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to sync measurement deletion:", error);
    return false;
  }
};

/**
 * Upload a custom exercise to the cloud.
 */
export const uploadCustomExercise = async (
  exercise: Exercise
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    await syncCustomExercise(userId, exercise);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to upload custom exercise:", error);
    return false;
  }
};

/**
 * Sync custom exercise deletion to cloud.
 */
export const syncCustomExerciseDeletion = async (
  exerciseId: string
): Promise<boolean> => {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    updateSyncStatus({ pendingUploads: syncStatus.pendingUploads + 1 });
    return false;
  }

  try {
    await markCloudCustomExerciseAsDeleted(userId, exerciseId);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to sync custom exercise deletion:", error);
    return false;
  }
};

// ==================== DOWNLOAD ON LOGIN ====================

export interface MergeResult {
  sessionsAdded: number;
  measurementsAdded: number;
  recordsAdded: number;
  conflictsResolved: number;
}

/**
 * Download all cloud data and merge with local data.
 * Called when user logs in on a new device.
 * 
 * Conflict Resolution Strategy:
 * - Sessions: Keep all unique sessions (by ID). If same ID exists, keep the one with later completedAt.
 * - Measurements: Keep all unique (by ID). If same ID, keep newer measuredAt.
 * - PRs: For same exercise, keep the higher weight. If same weight, keep newer achievedAt.
 */

export const downloadAndMergeCloudData = async (): Promise<{
  success: boolean;
  result?: MergeResult;
  error?: string;
}> => {
  const userId = getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Not logged in" };
  }

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return { success: false, error: "No internet connection" };
  }

  try {
    updateSyncStatus({ isSyncing: true });
    console.log("[Sync] Starting cloud data download...");

    // Get local data
    const localSessions = await getRecentSessions();
    const localRecords = await getPersonalRecords();

    // Get cloud data
    const cloudSessions = await getCloudSessions(userId);
    const cloudRecords = await getCloudPersonalRecords(userId);
    const cloudMeasurements = await getCloudMeasurements(userId);
    const cloudTemplates = await getCloudTemplates(userId);
    const cloudCustomExercises = await getCloudCustomExercises(userId);

    const result: MergeResult = {
      sessionsAdded: 0,
      measurementsAdded: 0,
      recordsAdded: 0,
      conflictsResolved: 0,
    };

    // Merge sessions
    // Get locally deleted sessions too, so we don't re-download them
    const deletedSessions = await getDeletedSessions();
    const localSessionIds = new Set(localSessions.map((s) => s.id));
    const locallyDeletedIds = new Set(deletedSessions.map((s) => s.id));
    
    // Merge Custom Exercises (Deletions & Additions)
    const cloudDeletedExercises = cloudCustomExercises.filter(e => e.deleted);
    for (const cloudEx of cloudDeletedExercises) {
      await hardDeleteLocalExercise(cloudEx.id);
      console.log(`[Sync] Applied cloud deletion for exercise: ${cloudEx.id}`);
    }

    // Additions/Updates
    // Fetch ALL exercises (including deleted) to avoid UNIQUE constraint errors on zombies
    const allLocalExercises = await getAllExercises(true);
    const localExMap = new Map(allLocalExercises.map(e => [e.id, e]));

    // Build map of ACTIVE names for conflict checking
    const activeNames = new Set(allLocalExercises.filter(e => !e.deleted).map(e => e.name.toLowerCase().trim()));

    // Deduplicate cloud exercises (Map key overwrite ensures unique IDs)
    const uniqueCloudExercises = Array.from(new Map(cloudCustomExercises.map(e => [e.id, e])).values());

    for (const cloudEx of uniqueCloudExercises) {
      if (cloudEx.deleted) continue;

      const localEx = localExMap.get(cloudEx.id);
      
      if (localEx) {
         if (localEx.deleted) {
             // Zombie Case: Revive it
             console.log(`[Sync] Reviving locally deleted exercise ${cloudEx.id} (Cloud is active)`);
             
             // Check name conflict with ACTIVE exercises
             if (activeNames.has(cloudEx.name.toLowerCase().trim())) {
                 console.log(`[Sync] Revived exercise name conflict for ${cloudEx.name}. Renaming.`);
                 cloudEx.name = `${cloudEx.name} (Revived)`;
             }
             
             await reviveExercise(cloudEx.id);
             // Then update
             await updateExercise(cloudEx.id, cloudEx);
             result.conflictsResolved++;
         } else {
             // Active Update
             // User Preference: Always prefer cloud data on conflict
             await updateExercise(cloudEx.id, cloudEx);
             result.conflictsResolved++;
         }
      } else {
         try {
           // Use saveCustomExercise (Upsert) to handle potential ID collisions safely
           await saveCustomExercise(cloudEx);
           console.log(`[Sync] Added new custom exercise: ${cloudEx.name} (${cloudEx.id})`);
         } catch (error: any) {
           if (error.message && error.message.includes("already exists")) {
             console.log(`[Sync] Name conflict for ${cloudEx.name}. Importing as duplicate.`);
             try {
               await saveCustomExercise({
                 ...cloudEx,
                 name: `${cloudEx.name} (Imported)`,
               });
             } catch (retryError) {
               console.error(`[Sync] Failed to import duplicate exercise:`, retryError);
             }
           } else {
             console.error(`[Sync] Failed to create custom exercise ${cloudEx.id}:`, error);
           }
         }
      }
    }

    // Merge Templates
    const locallyDeletedTemplates = await getDeletedTemplates();
    const locallyDeletedTemplateIds = new Set(locallyDeletedTemplates.map(t => t.id));
    const localTemplates = await getAllTemplates();
    const localTemplateIds = new Set(localTemplates.map(t => t.id));

    for (const cloudTemplate of cloudTemplates) {
       if (cloudTemplate.deleted) {
         await hardDeleteLocalTemplate(cloudTemplate.id);
         console.log(`[Sync] Applied cloud deletion for template: ${cloudTemplate.id}`);
         continue;
       }
       if (!locallyDeletedTemplateIds.has(cloudTemplate.id)) {
           if (localTemplateIds.has(cloudTemplate.id)) {
               // Update - Conflict Resolution: Last Write Wins
               const localTemplate = localTemplates.find(t => t.id === cloudTemplate.id);
               
               // If local is newer, keep local (don't overwrite)
               // If cloud is newer or timestamps missing, use cloud
               let useCloud = true;
               
               if (localTemplate && localTemplate.updatedAt && cloudTemplate.updatedAt) {
                   const localTime = new Date(localTemplate.updatedAt).getTime();
                   const cloudTime = new Date(cloudTemplate.updatedAt).getTime();
                   
                   // Compare with small buffer for clock diffs? Or strict? Strict for now.
                   if (localTime > cloudTime) {
                       useCloud = false;
                       console.log(`[Sync] Skipping cloud template update ${cloudTemplate.name} (Local is newer)`);
                   }
               }

               if (useCloud) {
                   try {
                      await saveSyncedTemplate(cloudTemplate);
                      result.conflictsResolved++;
                   } catch (e: any) {
                      console.error(`[Sync] Failed to update template ${cloudTemplate.id}:`, e);
                   }
               }
           } else {
               // Create (New from cloud)
               try {
                  await saveSyncedTemplate(cloudTemplate);
                  console.log(`[Sync] Added cloud template: ${cloudTemplate.name} (${cloudTemplate.id})`);
               } catch (createErr) {
                  console.error(`[Sync] Failed to save cloud template ${cloudTemplate.id}:`, createErr);
               }
           }
       }
    }



    // Merge Measurements (Deletions)
    const cloudDeletedMeasurementIds = new Set(cloudMeasurements.filter(m => m.deleted).map(m => m.id));
    if (cloudDeletedMeasurementIds.size > 0) {
       // Need to delete locally without triggering sync
       // Dynamically import store
       const { useMeasurementStore } = require("../stores/measurementStore");
       const measurementState = useMeasurementStore.getState();
       for (const id of cloudDeletedMeasurementIds) {
          if (measurementState.measurements.some((m: any) => m.id === id)) {
             measurementState.deleteMeasurementFromSync(id);
             console.log(`[Sync] Applied cloud deletion for measurement: ${id}`);
          }
       }
    }
    
    for (const cloudSession of cloudSessions) {
      // Handle cloud deletions - if cloud says deleted, delete locally
      if (cloudSession.deleted) {
        if (localSessionIds.has(cloudSession.id)) {
          await deleteWorkoutSession(cloudSession.id);
          console.log(`[Sync] Applied cloud deletion for session: ${cloudSession.id}`);
        }
        continue; // Skip adding deleted sessions
      }

      // Skip sessions that were deleted locally (local deletion wins)
      if (locallyDeletedIds.has(cloudSession.id)) {
        console.log(`[Sync] Skipping cloud session ${cloudSession.id} - deleted locally`);
        continue;
      }

      if (!localSessionIds.has(cloudSession.id)) {
        // New session from cloud - save to local DB
        await saveWorkoutSession(cloudSession);
        result.sessionsAdded++;
      } else {
        // Session exists locally - Conflict case
        // User Preference: Always prefer cloud data on conflict
        await saveWorkoutSession(cloudSession);
        result.conflictsResolved++;
      }
    }

    // Merge personal records
    // User Preference: Always prefer cloud data
    const localRecordsByExercise = new Map<string, PersonalRecord>();
    for (const record of localRecords) {
        localRecordsByExercise.set(record.exerciseId, record);
    }

    for (const cloudRecord of cloudRecords) {
      const localRecord = localRecordsByExercise.get(cloudRecord.exerciseId);
      // Since user wants to prefer Cloud, we overwrite local PR with Cloud PR
      // if it exists, regardless of weight/timestamp.
      // (Assuming Cloud is the source of truth)
      await savePersonalRecord(cloudRecord);
      
      if (!localRecord) {
          result.recordsAdded++;
      } else {
          result.conflictsResolved++;
      }
    }

    // Note: Measurements don't have a local store function exposed yet,
    // they would be handled by measurementStore directly

    updateSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date(),
      pendingUploads: 0,
      error: null,
    });

    await updateUserProfile(userId, { lastSyncedAt: new Date() });

    console.log("[Sync] Download complete:", result);
    return { success: true, result };
  } catch (error) {
    console.error("[Sync] Download failed:", error);
    updateSyncStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : "Sync failed",
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
};

// ==================== SYNC PENDING UPLOADS ====================

/**
 * Upload all pending local data that hasn't been synced yet.
 * Called when coming back online or manually by user.
 */
export const syncPendingUploads = async (): Promise<{
  success: boolean;
  uploaded: number;
  error?: string;
}> => {
  const userId = getCurrentUserId();
  if (!userId) {
    return { success: false, uploaded: 0, error: "Not logged in" };
  }

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return { success: false, uploaded: 0, error: "No connection" };
  }

  try {
    updateSyncStatus({ isSyncing: true });
    console.log("[Sync] Uploading pending data...");

    const localSessions = await getRecentSessions();
    const localRecords = await getPersonalRecords();

    let uploaded = 0;

    // Upload sessions without syncedAt
    for (const session of localSessions) {
      if (!session.syncedAt) {
        await syncWorkoutSession(userId, session);
        // Mark as synced locally so it doesn't re-upload
        await markSessionSynced(session.id);
        uploaded++;
      }
    }

    // Upload deleted sessions (tombstones) to cloud
    const deletedSessions = await getDeletedSessions();
    for (const session of deletedSessions) {
      if (session.deletedAt) {
        await markCloudSessionAsDeleted(userId, session.id, session.deletedAt);
        // After successfully deleting from cloud, hard-delete local tombstone
        await hardDeleteLocalSession(session.id);
        uploaded++;
        console.log(`[Sync] Synced deletion for session: ${session.id}`);
      }
    }

    // Upload PRs without syncedAt
    for (const record of localRecords) {
      if (!record.syncedAt) {
        await syncPersonalRecord(userId, record);
        await markRecordSynced(record.id);
        uploaded++;
      }
    }

    // Upload pending measurements (from Zustand store)
    // We import dynamically to avoid circular dependencies if any
    const { useMeasurementStore } = require("../stores/measurementStore");
    const measurementState = useMeasurementStore.getState();
    const measurements = measurementState.measurements;

    // Upload deleted measurements
    const deletedMeasurementIds = measurementState.deletedIds || [];
    if (deletedMeasurementIds.length > 0) {
      for (const id of deletedMeasurementIds) {
        await markCloudMeasurementAsDeleted(userId, id);
      }
      measurementState.clearDeletedIds();
      uploaded += deletedMeasurementIds.length;
      console.log(`[Sync] Synced deletions for ${deletedMeasurementIds.length} measurements`);
    }

    // Upload unsynced templates
    const unsyncedTemplates = await getUnsyncedTemplates();
    for (const template of unsyncedTemplates) {
      await syncWorkoutTemplate(userId, template);
      await markTemplateSynced(template.id);
      uploaded++;
      console.log(`[Sync] Uploaded template: ${template.name}`);
    }

    // Upload deleted templates
    const deletedTemplates = await getDeletedTemplates();
    for (const template of deletedTemplates) {
      if (template.deletedAt) {
        await markCloudTemplateAsDeleted(userId, template.id);
        await hardDeleteLocalTemplate(template.id);
        uploaded++;
        console.log(`[Sync] Synced deletion for template: ${template.id}`);
      }
    }

    // Upload custom exercises
    const unsyncedExercises = await getCustomExercisesForSync();
    for (const exercise of unsyncedExercises) {
      await syncCustomExercise(userId, exercise);
      await markExerciseSynced(exercise.id);
      uploaded++;
    }

    // Upload deleted custom exercises
    const deletedExercises = await getDeletedExercises();
    for (const exercise of deletedExercises) {
       if (exercise.deletedAt) {
         await markCloudCustomExerciseAsDeleted(userId, exercise.id);
         await hardDeleteLocalExercise(exercise.id);
         uploaded++;
         console.log(`[Sync] Synced deletion for exercise: ${exercise.id}`);
       }
    }
    
    for (const measurement of measurements) {
      if (!measurement.syncedAt) {
        // Assume syncBodyMeasurement handles the upload
        // We need to verify if syncBodyMeasurement is available
        // It seems it is defined in syncService.ts effectively or imported
        
        // Wait, syncBodyMeasurement is defined in THIS file?
        // Let's check.
        await syncBodyMeasurement(userId, measurement);
        
        // Mark as synced
        measurementState.updateMeasurement(measurement.id, {
           syncedAt: new Date()
        });
        uploaded++;
      }
    }

    updateSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date(),
      pendingUploads: 0,
      error: null,
    });

    console.log("[Sync] Uploaded pending items:", uploaded);
    return { success: true, uploaded };
  } catch (error) {
    console.error("[Sync] Pending upload failed:", error);
    updateSyncStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : "Upload failed",
    });
    return {
      success: false,
      uploaded: 0,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
};

// ==================== FULL BIDIRECTIONAL SYNC ====================

/**
 * Perform a full bidirectional sync:
 * 1. Upload all local unsynced data
 * 2. Download all cloud data
 * 3. Merge with conflict resolution
 */
export const performFullSync = async (): Promise<{
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  error?: string;
}> => {
  console.log("[Sync] Starting full bidirectional sync...");

  // First upload pending
  const uploadResult = await syncPendingUploads();
  if (!uploadResult.success) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      error: uploadResult.error,
    };
  }

  // Then download and merge
  // Check if user is still logged in before proceeding
  if (!getCurrentUserId()) {
    return {
      success: false,
      uploaded: uploadResult.uploaded,
      downloaded: 0,
      conflicts: 0,
      error: "User signed out during sync",
    };
  }

  const downloadResult = await downloadAndMergeCloudData();
  if (!downloadResult.success) {
    return {
      success: false,
      uploaded: uploadResult.uploaded,
      downloaded: 0,
      conflicts: 0,
      error: downloadResult.error,
    };
  }

  return {
    success: true,
    uploaded: uploadResult.uploaded,
    downloaded:
      (downloadResult.result?.sessionsAdded || 0) +
      (downloadResult.result?.recordsAdded || 0) +
      (downloadResult.result?.measurementsAdded || 0),
    conflicts: downloadResult.result?.conflictsResolved || 0,
  };
};

// ==================== NETWORK LISTENER ====================

let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Start listening for network changes.
 * When coming back online, automatically sync pending uploads.
 */
export const startNetworkListener = () => {
  if (unsubscribeNetInfo) return; // Already listening

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const wasOffline = !syncStatus.isOnline;
    updateSyncStatus({ isOnline: !!state.isConnected });

    // If we just came back online and have pending uploads, sync them
    if (wasOffline && state.isConnected && syncStatus.pendingUploads > 0) {
      console.log("[Sync] Back online, syncing pending uploads...");
      syncPendingUploads();
    }
  });
};

/**
 * Stop listening for network changes.
 */
export const stopNetworkListener = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
};
