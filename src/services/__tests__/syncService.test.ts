/**
 * Unit Tests for syncService.ts
 *
 * Tests cover:
 * - Sync status management
 * - Upload functions (workout, measurement, PR)
 * - Download and merge with conflict resolution
 * - Pending upload sync
 * - Full bidirectional sync
 */

import {
  getSyncStatus,
  subscribeSyncStatus,
  uploadWorkoutSession,
  uploadMeasurement,
  uploadPersonalRecord,
  downloadAndMergeCloudData,
  syncPendingUploads,
  performFullSync,
  startNetworkListener,
  stopNetworkListener,
} from "../syncService";

import * as firebase from "../firebase";
import * as auth from "../auth";
import * as database from "../database";
import * as templateQueries from "../database/templateQueries";
import * as exerciseQueries from "../database/exerciseQueries";
import NetInfo from "@react-native-community/netinfo";

import type { WorkoutSession, BodyMeasurement, PersonalRecord } from "../../types";

// Helper to create mock workout session
const createMockSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: "session-1",
  userId: "user-1",
  templateId: "template-1",
  templateName: "Push Day",
  startedAt: new Date("2026-01-14T10:00:00Z"),
  completedAt: new Date("2026-01-14T11:00:00Z"),
  durationSeconds: 3600,
  totalVolume: 5000,
  syncedAt: null,
  exerciseLogs: [],
  ...overrides,
});

// Helper to create mock measurement
const createMockMeasurement = (overrides: Partial<BodyMeasurement> = {}): BodyMeasurement => ({
  id: "measurement-1",
  userId: "user-1",
  weight: 180,
  chest: null,
  waist: null,
  hips: null,
  leftArm: null,
  rightArm: null,
  leftThigh: null,
  rightThigh: null,
  notes: null,
  measuredAt: new Date("2026-01-14T10:00:00Z"),
  syncedAt: null,
  ...overrides,
});

// Helper to create mock personal record
const createMockPR = (overrides: Partial<PersonalRecord> = {}): PersonalRecord => ({
  id: "pr-1",
  userId: "user-1",
  exerciseId: "exercise-1",
  exerciseName: "Bench Press",
  weight: 225,
  reps: 5,
  achievedAt: new Date("2026-01-14T10:00:00Z"),
  sessionId: "session-1",
  syncedAt: null,
  ...overrides,
});

describe("syncService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Restore default mock implementations after clearing
    // Default: no user logged in, online
    (auth.getCurrentUserId as jest.Mock).mockReturnValue(null);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    
    // Default: firebase sync functions succeed
    (firebase.syncWorkoutSession as jest.Mock).mockResolvedValue(undefined);
    (firebase.syncBodyMeasurement as jest.Mock).mockResolvedValue(undefined);
    (firebase.syncPersonalRecord as jest.Mock).mockResolvedValue(undefined);
    (firebase.syncCustomExercise as jest.Mock).mockResolvedValue(undefined);
    (firebase.syncWorkoutTemplate as jest.Mock).mockResolvedValue(undefined);
    (firebase.updateUserProfile as jest.Mock).mockResolvedValue(undefined);
    (firebase.markCloudSessionAsDeleted as jest.Mock).mockResolvedValue(undefined);
    
    // Default: empty data returns
    (database.getRecentSessions as jest.Mock).mockResolvedValue([]);
    (database.getDeletedSessions as jest.Mock).mockResolvedValue([]);
    (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
    (firebase.getCloudSessions as jest.Mock).mockResolvedValue([]);
    (firebase.getCloudPersonalRecords as jest.Mock).mockResolvedValue([]);
    (firebase.getCloudMeasurements as jest.Mock).mockResolvedValue([]);
    (firebase.getCloudTemplates as jest.Mock).mockResolvedValue([]);
    (firebase.getCloudCustomExercises as jest.Mock).mockResolvedValue([]);
    (templateQueries.getAllTemplates as jest.Mock).mockResolvedValue([]);
    (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
    (templateQueries.getUnsyncedTemplates as jest.Mock).mockResolvedValue([]);
    (exerciseQueries.getAllExercises as jest.Mock).mockResolvedValue([]);
    (exerciseQueries.getCustomExercisesForSync as jest.Mock).mockResolvedValue([]);
    (exerciseQueries.getDeletedExercises as jest.Mock).mockResolvedValue([]);
  });

  // ==================== SYNC STATUS ====================
  describe("getSyncStatus", () => {
    it("should return initial sync status", () => {
      const status = getSyncStatus();
      expect(status).toHaveProperty("isOnline");
      expect(status).toHaveProperty("isSyncing");
      expect(status).toHaveProperty("lastSyncedAt");
      expect(status).toHaveProperty("pendingUploads");
      expect(status).toHaveProperty("error");
    });
  });

  describe("subscribeSyncStatus", () => {
    it("should return unsubscribe function", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeSyncStatus(listener);
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });
  });

  // ==================== UPLOAD WORKOUT SESSION ====================
  describe("uploadWorkoutSession", () => {
    it("should skip upload if no user is logged in", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue(null);

      const session = createMockSession();
      const result = await uploadWorkoutSession(session);

      expect(result).toBe(false);
      expect(firebase.syncWorkoutSession).not.toHaveBeenCalled();
    });

    it("should queue upload when offline", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      const session = createMockSession();
      const result = await uploadWorkoutSession(session);

      expect(result).toBe(false);
      expect(firebase.syncWorkoutSession).not.toHaveBeenCalled();
    });

    it("should upload successfully when online", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const session = createMockSession();
      const result = await uploadWorkoutSession(session);

      expect(result).toBe(true);
      expect(firebase.syncWorkoutSession).toHaveBeenCalledWith("user-1", session);
    });

    it("should handle upload errors gracefully", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      (firebase.syncWorkoutSession as jest.Mock).mockRejectedValue(new Error("Network error"));

      const session = createMockSession();
      const result = await uploadWorkoutSession(session);

      expect(result).toBe(false);
    });
  });

  // ==================== UPLOAD MEASUREMENT ====================
  describe("uploadMeasurement", () => {
    it("should skip if no user is logged in", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue(null);

      const measurement = createMockMeasurement();
      const result = await uploadMeasurement(measurement);

      expect(result).toBe(false);
    });

    it("should return false when offline", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      const measurement = createMockMeasurement();
      const result = await uploadMeasurement(measurement);

      expect(result).toBe(false);
    });

    it("should upload successfully when online", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const measurement = createMockMeasurement();
      const result = await uploadMeasurement(measurement);

      expect(result).toBe(true);
      expect(firebase.syncBodyMeasurement).toHaveBeenCalledWith("user-1", measurement);
    });
  });

  // ==================== UPLOAD PERSONAL RECORD ====================
  describe("uploadPersonalRecord", () => {
    it("should skip if no user is logged in", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue(null);

      const pr = createMockPR();
      const result = await uploadPersonalRecord(pr);

      expect(result).toBe(false);
    });

    it("should return false when offline", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      const pr = createMockPR();
      const result = await uploadPersonalRecord(pr);

      expect(result).toBe(false);
    });

    it("should upload successfully when online", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const pr = createMockPR();
      const result = await uploadPersonalRecord(pr);

      expect(result).toBe(true);
      expect(firebase.syncPersonalRecord).toHaveBeenCalledWith("user-1", pr);
    });
  });

  // ==================== DOWNLOAD AND MERGE ====================
  describe("downloadAndMergeCloudData", () => {
    it("should return error if not logged in", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue(null);

      const result = await downloadAndMergeCloudData();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not logged in");
    });

    it("should return error if offline", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      const result = await downloadAndMergeCloudData();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No internet connection");
    });

    it("should merge new sessions from cloud", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const cloudSession = createMockSession({ id: "cloud-session-1" });
      (firebase.getCloudSessions as jest.Mock).mockResolvedValue([cloudSession]);
      (database.getRecentSessions as jest.Mock).mockResolvedValue([]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudMeasurements as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudTemplates as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudCustomExercises as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getAllTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getAllExercises as jest.Mock).mockResolvedValue([]);

      const result = await downloadAndMergeCloudData();

      expect(result.success).toBe(true);
      expect(result.result?.sessionsAdded).toBe(1);
      expect(database.saveWorkoutSession).toHaveBeenCalledWith(cloudSession);
    });

    it("should keep cloud session if it has a newer completedAt", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const localSession = createMockSession({
        id: "session-conflict",
        completedAt: new Date("2026-01-14T10:00:00Z"),
      });
      const cloudSession = createMockSession({
        id: "session-conflict",
        completedAt: new Date("2026-01-14T12:00:00Z"), // Newer
      });

      (database.getRecentSessions as jest.Mock).mockResolvedValue([localSession]);
      (firebase.getCloudSessions as jest.Mock).mockResolvedValue([cloudSession]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudMeasurements as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudTemplates as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudCustomExercises as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getAllTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getAllExercises as jest.Mock).mockResolvedValue([]);

      const result = await downloadAndMergeCloudData();

      expect(result.success).toBe(true);
      expect(result.result?.conflictsResolved).toBeGreaterThanOrEqual(1);
      expect(database.saveWorkoutSession).toHaveBeenCalledWith(cloudSession);
    });

    it("should skip cloud sessions that were deleted locally", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const cloudSession = createMockSession({ id: "deleted-locally" });
      const deletedSession = createMockSession({ id: "deleted-locally", deletedAt: new Date() });

      (firebase.getCloudSessions as jest.Mock).mockResolvedValue([cloudSession]);
      (database.getRecentSessions as jest.Mock).mockResolvedValue([]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([deletedSession]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudMeasurements as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudTemplates as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudCustomExercises as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getAllTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getAllExercises as jest.Mock).mockResolvedValue([]);

      const result = await downloadAndMergeCloudData();

      expect(result.success).toBe(true);
      expect(result.result?.sessionsAdded).toBe(0);
      expect(database.saveWorkoutSession).not.toHaveBeenCalled();
    });

    it("should keep the higher weight PR during conflict resolution", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const localPR = createMockPR({ exerciseId: "bench", weight: 200 });
      const cloudPR = createMockPR({ id: "pr-cloud", exerciseId: "bench", weight: 225 }); // Higher weight

      (database.getRecentSessions as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudSessions as jest.Mock).mockResolvedValue([]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([localPR]);
      (firebase.getCloudPersonalRecords as jest.Mock).mockResolvedValue([cloudPR]);
      (firebase.getCloudMeasurements as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudTemplates as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudCustomExercises as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getAllTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getAllExercises as jest.Mock).mockResolvedValue([]);

      const result = await downloadAndMergeCloudData();

      expect(result.success).toBe(true);
      expect(result.result?.conflictsResolved).toBe(1);
      expect(database.savePersonalRecord).toHaveBeenCalledWith(cloudPR);
    });
  });

  // ==================== SYNC PENDING UPLOADS ====================
  describe("syncPendingUploads", () => {
    it("should return error if not logged in", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue(null);

      const result = await syncPendingUploads();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not logged in");
    });

    it("should return error if offline", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      const result = await syncPendingUploads();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No connection");
    });

    it("should upload unsynced sessions and mark them synced", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const unsyncedSession = createMockSession({ syncedAt: null });
      (database.getRecentSessions as jest.Mock).mockResolvedValue([unsyncedSession]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
      (templateQueries.getUnsyncedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getCustomExercisesForSync as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getDeletedExercises as jest.Mock).mockResolvedValue([]);

      const result = await syncPendingUploads();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBeGreaterThanOrEqual(1);
      expect(firebase.syncWorkoutSession).toHaveBeenCalledWith("user-1", unsyncedSession);
      expect(database.markSessionSynced).toHaveBeenCalledWith(unsyncedSession.id);
    });

    it("should upload deleted sessions as tombstones and hard-delete locally", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const deletedSession = createMockSession({
        id: "deleted-session",
        deletedAt: new Date("2026-01-14T12:00:00Z"),
      });

      (database.getRecentSessions as jest.Mock).mockResolvedValue([]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([deletedSession]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
      (templateQueries.getUnsyncedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getCustomExercisesForSync as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getDeletedExercises as jest.Mock).mockResolvedValue([]);

      const result = await syncPendingUploads();

      expect(result.success).toBe(true);
      expect(firebase.markCloudSessionAsDeleted).toHaveBeenCalledWith(
        "user-1",
        deletedSession.id,
        deletedSession.deletedAt
      );
      expect(database.hardDeleteLocalSession).toHaveBeenCalledWith(deletedSession.id);
    });
  });

  // ==================== PERFORM FULL SYNC ====================
  describe("performFullSync", () => {
    it("should first upload pending, then download and merge", async () => {
      (auth.getCurrentUserId as jest.Mock).mockReturnValue("user-1");
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      // Setup empty returns for a clean sync
      (database.getRecentSessions as jest.Mock).mockResolvedValue([]);
      (database.getDeletedSessions as jest.Mock).mockResolvedValue([]);
      (database.getPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudSessions as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudPersonalRecords as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudMeasurements as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudTemplates as jest.Mock).mockResolvedValue([]);
      (firebase.getCloudCustomExercises as jest.Mock).mockResolvedValue([]);
      (templateQueries.getUnsyncedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getDeletedTemplates as jest.Mock).mockResolvedValue([]);
      (templateQueries.getAllTemplates as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getCustomExercisesForSync as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getDeletedExercises as jest.Mock).mockResolvedValue([]);
      (exerciseQueries.getAllExercises as jest.Mock).mockResolvedValue([]);

      const result = await performFullSync();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("uploaded");
      expect(result).toHaveProperty("downloaded");
      expect(result).toHaveProperty("conflicts");
    });
  });

  // ==================== NETWORK LISTENER ====================
  describe("Network Listener", () => {
    it("should start and stop network listener", () => {
      startNetworkListener();
      expect(NetInfo.addEventListener).toHaveBeenCalled();

      stopNetworkListener();
      // Should not throw
    });
  });
});
