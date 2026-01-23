import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  deleteDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  PersonalRecord,
  BodyMeasurement,
  ExerciseLog,
  Set,
} from "../types";

// Firebase configuration - Replace with your Firebase project config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export const initializeFirebase = () => {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    // Initialize auth with AsyncStorage persistence for React Native
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return { app, db, auth };
};

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};

export const getFirebaseDb = () => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

// Collection names
const COLLECTIONS = {
  users: "users",
  exercises: "exercises",
  templates: "templates",
  sessions: "sessions",
  exerciseLogs: "exerciseLogs",
  sets: "sets",
  personalRecords: "personalRecords",
  measurements: "measurements",
  settings: "settings",
};

// Helper to convert dates to Firestore timestamps
const toFirestoreTimestamp = (
  date: Date | string | null | undefined
): Timestamp | null => {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return Timestamp.fromDate(d);
};

// Helper to convert Firestore timestamps to dates
const fromFirestoreTimestamp = (
  timestamp: Timestamp | null | undefined
): Date | null => {
  if (!timestamp) return null;
  return timestamp.toDate();
};

// ==================== USER PROFILE ====================

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  preferredUnit: "lbs" | "kg";
  weeklyGoal: number;
  defaultRestTime: number;
  height?: number; // in cm
  weight?: number; // in kg
  birthYear?: number;
  fitnessGoal?: string;
  createdAt: Date;
  lastSyncedAt: Date;
}

export const createUserProfile = async (
  userId: string,
  email: string,
  displayName?: string
): Promise<UserProfile> => {
  const db = getFirebaseDb();
  const userRef = doc(db, COLLECTIONS.users, userId);

  const profile: UserProfile = {
    id: userId,
    email,
    displayName: displayName || null,
    preferredUnit: "lbs",
    weeklyGoal: 4,
    defaultRestTime: 90,
    createdAt: new Date(),
    lastSyncedAt: new Date(),
  };

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
    lastSyncedAt: serverTimestamp(),
  });

  return profile;
};

export const getUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  const db = getFirebaseDb();
  const userRef = doc(db, COLLECTIONS.users, userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: fromFirestoreTimestamp(data.createdAt) || new Date(),
    lastSyncedAt: fromFirestoreTimestamp(data.lastSyncedAt) || new Date(),
  } as UserProfile;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<UserProfile, "id" | "email" | "createdAt">>
): Promise<void> => {
  const db = getFirebaseDb();
  const userRef = doc(db, COLLECTIONS.users, userId);

  await setDoc(
    userRef,
    {
      ...updates,
      lastSyncedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// ==================== WORKOUT SESSIONS ====================

export const syncWorkoutSession = async (
  userId: string,
  session: WorkoutSession
): Promise<void> => {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  // Sync the main session document
  const sessionRef = doc(db, COLLECTIONS.sessions, session.id);
  batch.set(sessionRef, {
    userId,
    templateId: session.templateId,
    templateName: session.templateName,
    startedAt: toFirestoreTimestamp(session.startedAt),
    completedAt: toFirestoreTimestamp(session.completedAt),
    durationSeconds: session.durationSeconds,
    totalVolume: session.totalVolume,
    deleted: session.deleted || false,
    deletedAt: toFirestoreTimestamp(session.deletedAt),
    syncedAt: serverTimestamp(),
  });

  // Sync exercise logs
  if (session.exerciseLogs) {
    for (const log of session.exerciseLogs) {
      const logRef = doc(db, COLLECTIONS.exerciseLogs, log.id);
      batch.set(logRef, {
        userId,
        sessionId: session.id,
        exerciseId: log.exerciseId,
        exerciseName: log.exerciseName,
        completedAt: toFirestoreTimestamp(log.completedAt),
        syncedAt: serverTimestamp(),
      });

      // Sync sets
      if (log.sets) {
        for (const set of log.sets) {
          const setRef = doc(db, COLLECTIONS.sets, set.id);
          batch.set(setRef, {
            userId,
            exerciseLogId: log.id,
            sessionId: session.id,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            isPR: set.isPR,
            loggedAt: toFirestoreTimestamp(set.loggedAt),
            syncedAt: serverTimestamp(),
          });
        }
      }
    }
  }

  await batch.commit();
};

// Delete a session completely from Firestore (hard delete)
export const markCloudSessionAsDeleted = async (
  userId: string,
  sessionId: string,
  deletedAt: Date
): Promise<void> => {
  const db = getFirebaseDb();
  
  try {
    // First, delete all sets for this session's exercise logs
    const setsRef = collection(db, COLLECTIONS.sets);
    const setsQuery = query(setsRef, where("sessionId", "==", sessionId));
    const setsSnapshot = await getDocs(setsQuery);
    
    for (const setDoc of setsSnapshot.docs) {
      await deleteDoc(setDoc.ref);
    }
    
    // Delete all exercise logs for this session
    const logsRef = collection(db, COLLECTIONS.exerciseLogs);
    const logsQuery = query(logsRef, where("sessionId", "==", sessionId));
    const logsSnapshot = await getDocs(logsQuery);
    
    for (const logDoc of logsSnapshot.docs) {
      await deleteDoc(logDoc.ref);
    }
    
    // Finally, delete the session itself
    const sessionRef = doc(db, COLLECTIONS.sessions, sessionId);
    await deleteDoc(sessionRef);
    
    console.log(`[Firebase] Hard deleted session ${sessionId} and related data`);
  } catch (error) {
    // If document doesn't exist, that's fine - it's already deleted
    console.log(`[Firebase] Session ${sessionId} already deleted or doesn't exist`);
  }
};

export const getCloudSessions = async (
  userId: string,
  limit: number = 100
): Promise<WorkoutSession[]> => {
  const db = getFirebaseDb();
  const sessionsRef = collection(db, COLLECTIONS.sessions);
  const q = query(
    sessionsRef,
    where("userId", "==", userId),
    orderBy("startedAt", "desc")
  );

  const snapshot = await getDocs(q);
  const sessions: WorkoutSession[] = [];

  for (const docSnap of snapshot.docs.slice(0, limit)) {
    const data = docSnap.data();

    // Get exercise logs for this session
    const logsRef = collection(db, COLLECTIONS.exerciseLogs);
    const logsQuery = query(logsRef, where("sessionId", "==", docSnap.id));
    const logsSnapshot = await getDocs(logsQuery);

    const exerciseLogs: ExerciseLog[] = [];

    for (const logDoc of logsSnapshot.docs) {
      const logData = logDoc.data();

      // Get sets for this exercise log
      const setsRef = collection(db, COLLECTIONS.sets);
      const setsQuery = query(setsRef, where("exerciseLogId", "==", logDoc.id));
      const setsSnapshot = await getDocs(setsQuery);

      const sets: Set[] = setsSnapshot.docs
        .map((setDoc) => {
          const setData = setDoc.data();
          return {
            id: setDoc.id,
            exerciseLogId: logDoc.id,
            setNumber: setData.setNumber,
            weight: setData.weight,
            reps: setData.reps,
            rpe: setData.rpe ?? null,
            isPR: setData.isPR,
            loggedAt: fromFirestoreTimestamp(setData.loggedAt) || new Date(),
          };
        })
        .sort((a, b) => a.setNumber - b.setNumber);

      exerciseLogs.push({
        id: logDoc.id,
        sessionId: docSnap.id,
        exerciseId: logData.exerciseId,
        exerciseName: logData.exerciseName,
        completedAt: fromFirestoreTimestamp(logData.completedAt),
        sets,
      });
    }

    sessions.push({
      id: docSnap.id,
      userId,
      templateId: data.templateId,
      templateName: data.templateName,
      startedAt: fromFirestoreTimestamp(data.startedAt) || new Date(),
      completedAt: fromFirestoreTimestamp(data.completedAt),
      durationSeconds: data.durationSeconds,
      totalVolume: data.totalVolume,
      syncedAt: fromFirestoreTimestamp(data.syncedAt),
      deleted: data.deleted || false,
      deletedAt: fromFirestoreTimestamp(data.deletedAt),
      exerciseLogs,
    });
  }

  return sessions;
};

export const deleteCloudSession = async (sessionId: string): Promise<void> => {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  // Delete sets for this session
  const setsRef = collection(db, COLLECTIONS.sets);
  const setsQuery = query(setsRef, where("sessionId", "==", sessionId));
  const setsSnapshot = await getDocs(setsQuery);
  setsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete exercise logs for this session
  const logsRef = collection(db, COLLECTIONS.exerciseLogs);
  const logsQuery = query(logsRef, where("sessionId", "==", sessionId));
  const logsSnapshot = await getDocs(logsQuery);
  logsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete the session
  const sessionRef = doc(db, COLLECTIONS.sessions, sessionId);
  batch.delete(sessionRef);

  await batch.commit();
};

// ==================== PERSONAL RECORDS ====================

export const syncPersonalRecord = async (
  userId: string,
  record: PersonalRecord
): Promise<void> => {
  const db = getFirebaseDb();
  const recordRef = doc(db, COLLECTIONS.personalRecords, record.id);

  await setDoc(recordRef, {
    userId,
    exerciseId: record.exerciseId,
    exerciseName: record.exerciseName,
    weight: record.weight,
    reps: record.reps,
    achievedAt: toFirestoreTimestamp(record.achievedAt),
    sessionId: record.sessionId,
    syncedAt: serverTimestamp(),
  });
};

export const getCloudPersonalRecords = async (
  userId: string
): Promise<PersonalRecord[]> => {
  const db = getFirebaseDb();
  const recordsRef = collection(db, COLLECTIONS.personalRecords);
  const q = query(recordsRef, where("userId", "==", userId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId,
      exerciseId: data.exerciseId,
      exerciseName: data.exerciseName,
      weight: data.weight,
      reps: data.reps,
      achievedAt: fromFirestoreTimestamp(data.achievedAt) || new Date(),
      sessionId: data.sessionId,
    };
  });
};

// ==================== BODY MEASUREMENTS ====================

export const syncBodyMeasurement = async (
  userId: string,
  measurement: BodyMeasurement
): Promise<void> => {
  const db = getFirebaseDb();
  const measurementRef = doc(db, COLLECTIONS.measurements, measurement.id);

  await setDoc(measurementRef, {
    userId,
    weight: measurement.weight,
    chest: measurement.chest,
    waist: measurement.waist,
    hips: measurement.hips,
    leftArm: measurement.leftArm,
    rightArm: measurement.rightArm,
    leftThigh: measurement.leftThigh,
    rightThigh: measurement.rightThigh,
    notes: measurement.notes,
    measuredAt: toFirestoreTimestamp(measurement.measuredAt),
    syncedAt: serverTimestamp(),
    deleted: measurement.deleted ? true : false,
    deletedAt: measurement.deletedAt
      ? toFirestoreTimestamp(measurement.deletedAt)
      : null,
  });
};

export const getCloudMeasurements = async (
  userId: string
): Promise<BodyMeasurement[]> => {
  const db = getFirebaseDb();
  const measurementsRef = collection(db, COLLECTIONS.measurements);
  const q = query(
    measurementsRef,
    where("userId", "==", userId),
    orderBy("measuredAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId,
      weight: data.weight,
      chest: data.chest,
      waist: data.waist,
      hips: data.hips,
      leftArm: data.leftArm,
      rightArm: data.rightArm,
      leftThigh: data.leftThigh,
      rightThigh: data.rightThigh,
      notes: data.notes,
      measuredAt: fromFirestoreTimestamp(data.measuredAt) || new Date(),
      syncedAt: fromFirestoreTimestamp(data.syncedAt),
      deleted: data.deleted,
      deletedAt: fromFirestoreTimestamp(data.deletedAt),
    };
  });
};

export const deleteCloudMeasurement = async (
  measurementId: string
): Promise<void> => {
  const db = getFirebaseDb();
  const measurementRef = doc(db, COLLECTIONS.measurements, measurementId);
  await deleteDoc(measurementRef);
};

export const markCloudMeasurementAsDeleted = async (
  userId: string,
  measurementId: string
): Promise<void> => {
  const db = getFirebaseDb();
  const measurementRef = doc(db, COLLECTIONS.measurements, measurementId);

  // We use setDoc with merge to ensure we don't fail if doc doesn't exist
  // (though usually we'd want to just update)
  await setDoc(
    measurementRef,
    {
      userId, // Ensure userId is present
      deleted: true,
      deletedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// ==================== CUSTOM EXERCISES ====================

export const syncCustomExercise = async (
  userId: string,
  exercise: Exercise
): Promise<void> => {
  const db = getFirebaseDb();
  const exerciseRef = doc(db, COLLECTIONS.exercises, exercise.id);

  await setDoc(exerciseRef, {
    userId,
    name: exercise.name,
    category: exercise.category,
    equipment: exercise.equipment,
    description: exercise.description,
    imageUrl: exercise.imageUrl,
    isCustom: true,
    createdAt: toFirestoreTimestamp(exercise.createdAt),
    updatedAt: serverTimestamp(),
    syncedAt: serverTimestamp(),
    deleted: exercise.deleted || false,
    deletedAt: toFirestoreTimestamp(exercise.deletedAt),
  });
};

export const getCloudCustomExercises = async (
  userId: string
): Promise<Exercise[]> => {
  const db = getFirebaseDb();
  const exercisesRef = collection(db, COLLECTIONS.exercises);
  const q = query(exercisesRef, where("userId", "==", userId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId,
      name: data.name,
      category: data.category,
      equipment: data.equipment,
      description: data.description,
      imageUrl: data.imageUrl,
      isCustom: true,
      createdAt: fromFirestoreTimestamp(data.createdAt) || new Date(),
      updatedAt: fromFirestoreTimestamp(data.updatedAt) || new Date(),
      syncedAt: fromFirestoreTimestamp(data.syncedAt),
      deleted: data.deleted,
      deletedAt: fromFirestoreTimestamp(data.deletedAt),
    };
  });
};

export const deleteCloudExercise = async (
  exerciseId: string
): Promise<void> => {
  const db = getFirebaseDb();
  const exerciseRef = doc(db, COLLECTIONS.exercises, exerciseId);
  await deleteDoc(exerciseRef);
};

export const markCloudCustomExerciseAsDeleted = async (
  userId: string,
  exerciseId: string
): Promise<void> => {
  const db = getFirebaseDb();
  const exerciseRef = doc(db, COLLECTIONS.exercises, exerciseId);

  await setDoc(
    exerciseRef,
    {
      userId,
      deleted: true,
      deletedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// ==================== WORKOUT TEMPLATES ====================

export const syncWorkoutTemplate = async (
  userId: string,
  template: WorkoutTemplate
): Promise<void> => {
  const db = getFirebaseDb();
  const templateRef = doc(db, COLLECTIONS.templates, template.id);

  await setDoc(templateRef, {
    userId,
    name: template.name,
    isPreset: false,
    exercises: template.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      displayOrder: e.displayOrder,
    })),
    createdAt: toFirestoreTimestamp(template.createdAt),
    updatedAt: serverTimestamp(),
    deleted: template.deleted ? true : false,
    deletedAt: template.deletedAt
      ? toFirestoreTimestamp(template.deletedAt)
      : null,
  });
};

export const getCloudTemplates = async (
  userId: string
): Promise<WorkoutTemplate[]> => {
  const db = getFirebaseDb();
  const templatesRef = collection(db, COLLECTIONS.templates);
  const q = query(templatesRef, where("userId", "==", userId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId,
      name: data.name,
      isPreset: false,
      exercises: data.exercises || [],
      createdAt: fromFirestoreTimestamp(data.createdAt) || new Date(),
      updatedAt: fromFirestoreTimestamp(data.updatedAt) || new Date(),
      deleted: data.deleted,
      deletedAt: fromFirestoreTimestamp(data.deletedAt),
    };
  });
};

export const deleteCloudTemplate = async (
  templateId: string
): Promise<void> => {
  const db = getFirebaseDb();
  const templateRef = doc(db, COLLECTIONS.templates, templateId);
  await deleteDoc(templateRef);
};

export const markCloudTemplateAsDeleted = async (
  userId: string,
  templateId: string
): Promise<void> => {
  const db = getFirebaseDb();
  const templateRef = doc(db, COLLECTIONS.templates, templateId);

  await setDoc(
    templateRef,
    {
      userId,
      deleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// ==================== FULL SYNC OPERATIONS ====================

export interface SyncResult {
  success: boolean;
  error?: string;
  stats?: {
    sessionsUploaded: number;
    sessionsDownloaded: number;
    measurementsUploaded: number;
    measurementsDownloaded: number;
    recordsUploaded: number;
    recordsDownloaded: number;
  };
}

export const syncAllData = async (
  userId: string,
  localData: {
    sessions: WorkoutSession[];
    measurements: BodyMeasurement[];
    personalRecords: PersonalRecord[];
    customExercises: Exercise[];
    customTemplates: WorkoutTemplate[];
  }
): Promise<SyncResult> => {
  try {
    const stats = {
      sessionsUploaded: 0,
      sessionsDownloaded: 0,
      measurementsUploaded: 0,
      measurementsDownloaded: 0,
      recordsUploaded: 0,
      recordsDownloaded: 0,
    };

    // Upload local sessions that haven't been synced
    for (const session of localData.sessions) {
      if (!session.syncedAt) {
        await syncWorkoutSession(userId, session);
        stats.sessionsUploaded++;
      }
    }

    // Upload local measurements that haven't been synced
    for (const measurement of localData.measurements) {
      if (!measurement.syncedAt) {
        await syncBodyMeasurement(userId, measurement);
        stats.measurementsUploaded++;
      }
    }

    // Upload personal records
    for (const record of localData.personalRecords) {
      await syncPersonalRecord(userId, record);
      stats.recordsUploaded++;
    }

    // Upload custom exercises
    for (const exercise of localData.customExercises) {
      await syncCustomExercise(userId, exercise);
    }

    // Upload custom templates
    for (const template of localData.customTemplates) {
      await syncWorkoutTemplate(userId, template);
    }

    // Get cloud data
    const cloudSessions = await getCloudSessions(userId);
    const cloudMeasurements = await getCloudMeasurements(userId);
    const cloudRecords = await getCloudPersonalRecords(userId);

    // Calculate downloaded count (items that exist in cloud but not locally)
    const localSessionIds = new Set(localData.sessions.map((s) => s.id));
    const localMeasurementIds = new Set(
      localData.measurements.map((m) => m.id)
    );
    const localRecordIds = new Set(localData.personalRecords.map((r) => r.id));

    stats.sessionsDownloaded = cloudSessions.filter(
      (s) => !localSessionIds.has(s.id)
    ).length;
    stats.measurementsDownloaded = cloudMeasurements.filter(
      (m) => !localMeasurementIds.has(m.id)
    ).length;
    stats.recordsDownloaded = cloudRecords.filter(
      (r) => !localRecordIds.has(r.id)
    ).length;

    // Update user's last sync time
    await updateUserProfile(userId, { lastSyncedAt: new Date() });

    return { success: true, stats };
  } catch (error) {
    console.error("Sync failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
};

// Check if there are pending changes to sync
export const hasPendingChanges = async (localData: {
  sessions: WorkoutSession[];
  measurements: BodyMeasurement[];
}): Promise<number> => {
  let pending = 0;

  for (const session of localData.sessions) {
    if (!session.syncedAt) pending++;
  }

  for (const measurement of localData.measurements) {
    if (!measurement.syncedAt) pending++;
  }

  return pending;
};
