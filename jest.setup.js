// Jest setup file
// Minimal setup to avoid Object.defineProperty errors

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    runAsync: jest.fn(),
    getAllAsync: jest.fn(() => []),
    getFirstAsync: jest.fn(),
    execAsync: jest.fn(),
    closeAsync: jest.fn(),
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo for sync service tests
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Firebase service
jest.mock('./src/services/firebase', () => ({
  syncWorkoutSession: jest.fn(() => Promise.resolve()),
  syncBodyMeasurement: jest.fn(() => Promise.resolve()),
  syncPersonalRecord: jest.fn(() => Promise.resolve()),
  syncCustomExercise: jest.fn(() => Promise.resolve()),
  syncWorkoutTemplate: jest.fn(() => Promise.resolve()),
  getCloudSessions: jest.fn(() => Promise.resolve([])),
  getCloudMeasurements: jest.fn(() => Promise.resolve([])),
  getCloudPersonalRecords: jest.fn(() => Promise.resolve([])),
  getCloudCustomExercises: jest.fn(() => Promise.resolve([])),
  getCloudTemplates: jest.fn(() => Promise.resolve([])),
  updateUserProfile: jest.fn(() => Promise.resolve()),
  markCloudSessionAsDeleted: jest.fn(() => Promise.resolve()),
  markCloudMeasurementAsDeleted: jest.fn(() => Promise.resolve()),
  markCloudTemplateAsDeleted: jest.fn(() => Promise.resolve()),
  markCloudCustomExerciseAsDeleted: jest.fn(() => Promise.resolve()),
}));

// Mock Auth service
jest.mock('./src/services/auth', () => ({
  getCurrentUserId: jest.fn(() => null),
}));

// Mock Database service
jest.mock('./src/services/database', () => ({
  getRecentSessions: jest.fn(() => Promise.resolve([])),
  saveWorkoutSession: jest.fn(() => Promise.resolve()),
  getPersonalRecords: jest.fn(() => Promise.resolve([])),
  savePersonalRecord: jest.fn(() => Promise.resolve()),
  getDeletedSessions: jest.fn(() => Promise.resolve([])),
  deleteWorkoutSession: jest.fn(() => Promise.resolve()),
  hardDeleteLocalSession: jest.fn(() => Promise.resolve()),
  markSessionSynced: jest.fn(() => Promise.resolve()),
  markRecordSynced: jest.fn(() => Promise.resolve()),
}));

// Mock Template queries
jest.mock('./src/services/database/templateQueries', () => ({
  getDeletedTemplates: jest.fn(() => Promise.resolve([])),
  hardDeleteLocalTemplate: jest.fn(() => Promise.resolve()),
  saveTemplate: jest.fn(() => Promise.resolve()),
  updateTemplate: jest.fn(() => Promise.resolve()),
  getAllTemplates: jest.fn(() => Promise.resolve([])),
  getUnsyncedTemplates: jest.fn(() => Promise.resolve([])),
  markTemplateSynced: jest.fn(() => Promise.resolve()),
}));

// Mock Exercise queries
jest.mock('./src/services/database/exerciseQueries', () => ({
  getCustomExercisesForSync: jest.fn(() => Promise.resolve([])),
  getDeletedExercises: jest.fn(() => Promise.resolve([])),
  hardDeleteLocalExercise: jest.fn(() => Promise.resolve()),
  markExerciseSynced: jest.fn(() => Promise.resolve()),
  createExercise: jest.fn(() => Promise.resolve()),
  updateExercise: jest.fn(() => Promise.resolve()),
  getAllExercises: jest.fn(() => Promise.resolve([])),
  reviveExercise: jest.fn(() => Promise.resolve()),
  saveCustomExercise: jest.fn(() => Promise.resolve()),
}));

// Mock Measurement Store
jest.mock('./src/stores/measurementStore', () => ({
  useMeasurementStore: {
    getState: jest.fn(() => ({
      measurements: [],
      deletedIds: [],
      updateMeasurement: jest.fn(),
      deleteMeasurementFromSync: jest.fn(),
      clearDeletedIds: jest.fn(),
    })),
  },
}));
