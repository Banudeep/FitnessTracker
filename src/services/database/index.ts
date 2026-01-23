/**
 * Database Module Index
 * Re-exports all database functions for backwards compatibility
 * 
 * This module maintains the same API as the original database.ts file,
 * while the implementation is split across multiple files for better maintainability.
 */

// Core exports
export {
  initDatabase,
  ensureDatabaseReady,
  closeDatabase,
  generateId,
  isWeb,
  db,
  webExercises,
  webTemplates,
  webSessions,
  webPersonalRecords,
} from "./core";

// Exercise queries
export {
  getAllExercises,
  createExercise,
  deleteExercise,
  updateExercise,
  getCustomExercisesForSync,
  getDeletedExercises,
  hardDeleteLocalExercise,
  markExerciseSynced,
  reviveExercise,
  saveCustomExercise,
} from "./exerciseQueries";

// Template queries
export {
  getAllTemplates,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  getDeletedTemplates,
  hardDeleteLocalTemplate,
  getUnsyncedTemplates,
  markTemplateSynced,
} from "./templateQueries";

// Re-export the remaining functions from the original file
// These will be migrated to separate modules in future iterations
export {
  deleteSet,
  updateSet,
  saveWorkoutSession,
  deleteWorkoutSession,
  getRecentSessions,
  getActiveWorkoutSessionByTemplate,
  getActiveWorkoutSession,
  getLastWorkoutForTemplate,
  getExerciseAnalytics,
  getRecentExerciseHistory,
  generateSyntheticExerciseData,
  generateRoutineBasedSyntheticData,
  getPersonalRecords,
  savePersonalRecord,
  clearAllSampleData,
  resetWorkoutData,
  getWeeklyWorkoutCounts,
  getDeletedSessions,
  hardDeleteLocalSession,
  markSessionSynced,
  markRecordSynced,
} from "../database";
