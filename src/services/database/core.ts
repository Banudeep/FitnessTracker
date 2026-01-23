/**
 * Database Core Module
 * Contains database initialization, shared state, and utility functions
 */
import { Platform } from "react-native";
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  PersonalRecord,
} from "../../types";
import { builtInExercises } from "../../constants/exercises";
import { presetTemplates } from "../../constants/templates";

// Check if we're on web
export const isWeb = Platform.OS === "web";

// Only import SQLite on native platforms
let SQLite: typeof import("expo-sqlite") | null = null;
export let db: import("expo-sqlite").SQLiteDatabase | null = null;
let dbInitialized = false;
let dbInitializing = false;

// In-memory storage for web
export let webExercises: Exercise[] = [];
export let webTemplates: WorkoutTemplate[] = [];
export let webSessions: WorkoutSession[] = [];
export let webPersonalRecords: PersonalRecord[] = [];
let webInitialized = false;

// Setters for web storage (used by other modules)
export const setWebSessions = (sessions: WorkoutSession[]) => {
  webSessions = sessions;
};

export const setWebExercises = (exercises: Exercise[]) => {
  webExercises = exercises;
};

export const setWebTemplates = (templates: WorkoutTemplate[]) => {
  webTemplates = templates;
};

export const setWebPersonalRecords = (records: PersonalRecord[]) => {
  webPersonalRecords = records;
};

export const generateId = () =>
  Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Generate sample sessions for web
const generateWebSampleData = () => {
  // Initialize exercises
  const now = new Date();
  webExercises = builtInExercises.map((ex, i) => ({
    ...ex,
    id: `ex-${i}`,
    isCustom: false,
    userId: null,
    createdAt: now,
    updatedAt: now,
  }));

  // Initialize templates
  webTemplates = presetTemplates.map((template, i) => {
    const templateId = `template-${i}`;
    return {
      id: templateId,
      userId: null,
      name: template.name,
      isPreset: true,
      exercises: template.exercises.map((exName, j) => {
        const ex = webExercises.find((e) => e.name === exName);
        const exerciseId = ex?.id || `ex-${j}`;
        return {
          id: `te-${i}-${j}`,
          templateId,
          exerciseId,
          exercise: ex,
          displayOrder: j,
        };
      }),
      createdAt: now,
      updatedAt: now,
    };
  });

  // Generate workout sessions (Oct-Dec 2025)
  const workoutTypes = [
    {
      name: "Push Day",
      exercises: ["Bench Press", "Overhead Press", "Tricep Pushdown"],
    },
    {
      name: "Pull Day",
      exercises: ["Barbell Row", "Lat Pulldown", "Bicep Curl"],
    },
    { name: "Leg Day", exercises: ["Squat", "Romanian Deadlift", "Leg Press"] },
    {
      name: "Upper Body",
      exercises: ["Bench Press", "Barbell Row", "Overhead Press"],
    },
  ];

  const startDate = new Date(2025, 9, 6); // Monday, October 6, 2025

  // Helper to pick random days from the week (0-6, where 0=Sunday)
  const getRandomWorkoutDays = () => {
    const allDays = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
    const numWorkouts = 3 + Math.floor(Math.random() * 3); // 3-5 workouts per week
    const shuffled = allDays.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numWorkouts).sort((a, b) => a - b);
  };

  let workoutIndex = 0;
  webSessions = [];

  for (let week = 0; week < 13; week++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + week * 7);

    // Skip week 6 to create a streak break
    if (week === 5) continue;

    // Pick random days for this week
    const workoutDays = getRandomWorkoutDays();

    for (const dayOfWeek of workoutDays) {
      const workoutDate = new Date(weekStartDate);
      // weekStartDate is Monday (day 1), so adjust to get the target day
      const currentDay = workoutDate.getDay(); // Should be 1 (Monday)
      const daysToAdd = dayOfWeek - currentDay;
      workoutDate.setDate(workoutDate.getDate() + daysToAdd);

      // Skip if outside Oct-Dec 2025 range
      if (
        workoutDate < new Date(2025, 9, 1) ||
        workoutDate > new Date(2025, 11, 31)
      ) {
        continue;
      }

      const workout = workoutTypes[workoutIndex % workoutTypes.length];
      const duration = Math.floor(Math.random() * 20 + 40) * 60;
      const hour = 6 + Math.floor(Math.random() * 12);
      const sessionDate = new Date(
        workoutDate.getFullYear(),
        workoutDate.getMonth(),
        workoutDate.getDate(),
        hour,
        Math.floor(Math.random() * 60),
        0
      );
      const completedDate = new Date(sessionDate.getTime() + duration * 1000);

      const monthsIn = workoutDate.getMonth() - 9;
      const totalVolume = Math.floor(
        Math.random() * 3000 + 10000 + monthsIn * 2000
      );

      webSessions.push({
        id: generateId(),
        userId: null,
        templateId: `template-${workoutIndex % 4}`,
        templateName: workout.name,
        startedAt: sessionDate,
        completedAt: completedDate,
        durationSeconds: duration,
        totalVolume,
        syncedAt: null,
        exerciseLogs: workout.exercises.map((exName, exIdx) => ({
          id: generateId(),
          sessionId: "",
          exerciseId: `ex-${exIdx}`,
          exerciseName: exName,
          completedAt: completedDate,
          sets: [1, 2, 3, 4].map((setNum) => ({
            id: generateId(),
            exerciseLogId: "",
            setNumber: setNum,
            weight: 125 + monthsIn * 10 + exIdx * 20,
            reps: 11 - setNum,
            rpe: null,
            isPR: false,
            loggedAt: sessionDate,
          })),
        })),
      });

      workoutIndex++;
    }
  }

  // Sample personal records
  webPersonalRecords = [
    {
      id: generateId(),
      userId: null,
      exerciseId: "ex-0",
      exerciseName: "Bench Press",
      weight: 185,
      reps: 5,
      achievedAt: new Date(2025, 11, 15),
      sessionId: null,
    },
    {
      id: generateId(),
      userId: null,
      exerciseId: "ex-1",
      exerciseName: "Squat",
      weight: 225,
      reps: 5,
      achievedAt: new Date(2025, 11, 10),
      sessionId: null,
    },
    {
      id: generateId(),
      userId: null,
      exerciseId: "ex-2",
      exerciseName: "Deadlift",
      weight: 275,
      reps: 3,
      achievedAt: new Date(2025, 10, 28),
      sessionId: null,
    },
    {
      id: generateId(),
      userId: null,
      exerciseId: "ex-3",
      exerciseName: "Overhead Press",
      weight: 115,
      reps: 6,
      achievedAt: new Date(2025, 10, 20),
      sessionId: null,
    },
    {
      id: generateId(),
      userId: null,
      exerciseId: "ex-4",
      exerciseName: "Barbell Row",
      weight: 155,
      reps: 8,
      achievedAt: new Date(2025, 9, 15),
      sessionId: null,
    },
  ];
};

// Seed exercises
// Seed exercises
const seedExercises = async (): Promise<void> => {
  if (!db) return;

  console.log("[Database] Starting exercise seeding...");

  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercises WHERE is_custom = 0"
  );
  
  const currentCount = count?.count || 0;
  console.log(`[Database] Found ${currentCount}/${builtInExercises.length} built-in exercises`);

  // If we have fewer exercises than expected, we need to find and add the missing ones
  if (currentCount < builtInExercises.length) {
    const now = new Date().toISOString();
    let addedCount = 0;

    for (const exercise of builtInExercises) {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM exercises WHERE name = ? AND is_custom = 0",
        [exercise.name]
      );

      if (!existing) {
        const id = generateId();
        await db.runAsync(
          `INSERT INTO exercises (id, name, category, equipment, description, image_url, is_custom, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            id,
            exercise.name,
            exercise.category,
            exercise.equipment,
            exercise.description,
            exercise.imageUrl,
            now,
            now,
          ]
        );
        console.log(`[Database] Added missing exercise: ${exercise.name}`);
        addedCount++;
      }
    }
    console.log(`[Database] Added ${addedCount} missing exercises`);
  } else {
    console.log("[Database] All built-in exercises already exist");
  }
};

// Seed templates
const seedTemplates = async (): Promise<void> => {
  if (!db) return;

  console.log("[Database] Starting template seeding...");

  // Always verify preset templates have correct exercises
  for (const template of presetTemplates) {
    // Check if preset template exists
    let templateRow = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM workout_templates WHERE name = ? AND is_preset = 1",
      [template.name]
    );
    
    const now = new Date().toISOString();
    let templateId: string;
    
    if (templateRow) {
      templateId = templateRow.id;
      console.log(`[Database] Found existing preset template: ${template.name} (${templateId})`);
    } else {
      // Create the preset template
      templateId = generateId();
      await db.runAsync(
        `INSERT INTO workout_templates (id, name, is_preset, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?)`,
        [templateId, template.name, now, now]
      );
      console.log(`[Database] Created preset template: ${template.name} (${templateId})`);
    }

    // Count current exercises for this specific template
    const teCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM template_exercises WHERE template_id = ?",
      [templateId]
    );
    
    const currentCount = teCount?.count || 0;
    const expectedCount = template.exercises.length;
    
    console.log(`[Database] Template "${template.name}": ${currentCount}/${expectedCount} exercises`);
    
    // Only seed if completely empty to avoid overwriting user customizations
    if (currentCount === 0) {
      console.log(`[Database] Seeding empty template: ${template.name}`);
      
      // Add all exercises
      for (let i = 0; i < template.exercises.length; i++) {
        const exerciseName = template.exercises[i];
        const exercise = await db.getFirstAsync<{ id: string }>(
          "SELECT id FROM exercises WHERE name = ?",
          [exerciseName]
        );

        if (exercise) {
          await db.runAsync(
            `INSERT INTO template_exercises (id, template_id, exercise_id, display_order)
             VALUES (?, ?, ?, ?)`,
            [generateId(), templateId, exercise.id, i]
          );
          console.log(`[Database] Added exercise to ${template.name}: ${exerciseName}`);
        } else {
          console.warn(`[Database] Exercise NOT FOUND for ${template.name}: "${exerciseName}"`);
        }
      }
    } else {
       console.log(`[Database] Template "${template.name}" already has ${currentCount} exercises. Skipping seeding to preserve customization.`);
    }
  }
  
  console.log("[Database] Template seeding completed");
};

// Seed sample workout sessions for the last 3 months
const seedWorkoutSessions = async (): Promise<void> => {
  if (!db) return;

  // Ensure app_settings table exists (for existing databases)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check if sample data was explicitly cleared by user
  const clearedFlag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'sample_data_cleared'"
  );
  if (clearedFlag?.value === "true") return; // Don't seed if user cleared sample data

  // Check if we already have workout sessions
  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workout_sessions"
  );

  if (count && count.count > 0) return; // Don't seed if data already exists

  const workoutTypes = [
    {
      name: "Push Day",
      exercises: ["Bench Press", "Overhead Press", "Tricep Pushdown"],
    },
    {
      name: "Pull Day",
      exercises: ["Barbell Row", "Lat Pulldown", "Bicep Curl"],
    },
    { name: "Leg Day", exercises: ["Squat", "Romanian Deadlift", "Leg Press"] },
    {
      name: "Upper Body",
      exercises: ["Bench Press", "Barbell Row", "Overhead Press"],
    },
  ];

  // Generate workouts week by week for 13 weeks (Oct 1 - Dec 31, 2025)
  const startDate = new Date(2025, 9, 6); // Monday, October 6, 2025

  // Helper to pick random days from the week
  const getRandomWorkoutDays = () => {
    const allDays = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
    const numWorkouts = 3 + Math.floor(Math.random() * 3); // 3-5 workouts per week
    const shuffled = allDays.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numWorkouts).sort((a, b) => a - b);
  };

  let workoutIndex = 0;

  for (let week = 0; week < 13; week++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + week * 7);

    // Skip week 6 to create a streak break
    if (week === 5) continue;

    // Pick random days for this week
    const workoutDays = getRandomWorkoutDays();

    for (const dayOfWeek of workoutDays) {
      const workoutDate = new Date(weekStartDate);
      const currentDay = workoutDate.getDay();
      const daysToAdd = dayOfWeek - currentDay;
      workoutDate.setDate(workoutDate.getDate() + daysToAdd);

      // Skip if outside Oct-Dec 2025 range
      if (
        workoutDate < new Date(2025, 9, 1) ||
        workoutDate > new Date(2025, 11, 31)
      ) {
        continue;
      }

      const workout = workoutTypes[workoutIndex % workoutTypes.length];
      const duration = Math.floor(Math.random() * 20 + 40) * 60; // 40-60 minutes
      const hour = 6 + Math.floor(Math.random() * 12);
      const sessionDate = new Date(
        workoutDate.getFullYear(),
        workoutDate.getMonth(),
        workoutDate.getDate(),
        hour,
        Math.floor(Math.random() * 60),
        0
      );
      const completedDate = new Date(sessionDate.getTime() + duration * 1000);

      const monthsIn = workoutDate.getMonth() - 9;
      const baseWeight = 125 + monthsIn * 10;
      const totalVolume = Math.floor(
        Math.random() * 3000 + 10000 + monthsIn * 2000
      );

      const sessionId = generateId();

      // Insert session - use special template_id pattern for sample data identification
      await db.runAsync(
        `INSERT INTO workout_sessions (id, user_id, template_id, template_name, started_at, completed_at, duration_seconds, total_volume, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          null,
          `sample-template-${workoutIndex % 4}`,
          workout.name,
          sessionDate.toISOString(),
          completedDate.toISOString(),
          duration,
          totalVolume,
          null,
        ]
      );

      // Insert exercise logs and sets
      for (let exIdx = 0; exIdx < workout.exercises.length; exIdx++) {
        const exerciseName = workout.exercises[exIdx];
        const logId = generateId();

        await db.runAsync(
          `INSERT INTO exercise_logs (id, session_id, exercise_id, exercise_name, completed_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            logId,
            sessionId,
            `ex-${exIdx}`,
            exerciseName,
            completedDate.toISOString(),
          ]
        );

        // Insert 4 sets per exercise
        for (let setNum = 1; setNum <= 4; setNum++) {
          const weight = baseWeight + exIdx * 20;
          const reps = 11 - setNum; // 10, 9, 8, 7 reps

          await db.runAsync(
            `INSERT INTO sets (id, exercise_log_id, set_number, weight, reps, is_pr, logged_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(),
              logId,
              setNum,
              weight,
              reps,
              0,
              sessionDate.toISOString(),
            ]
          );
        }
      }

      workoutIndex++;
    }
  }

  // Also seed some personal records
  const prs = [
    {
      exerciseName: "Bench Press",
      weight: 225,
      reps: 5,
      date: new Date(2025, 11, 15),
    },
    {
      exerciseName: "Squat",
      weight: 315,
      reps: 3,
      date: new Date(2025, 11, 10),
    },
    {
      exerciseName: "Deadlift",
      weight: 365,
      reps: 2,
      date: new Date(2025, 10, 28),
    },
    {
      exerciseName: "Overhead Press",
      weight: 135,
      reps: 8,
      date: new Date(2025, 11, 5),
    },
    {
      exerciseName: "Barbell Row",
      weight: 185,
      reps: 8,
      date: new Date(2025, 10, 20),
    },
  ];

  for (let i = 0; i < prs.length; i++) {
    const pr = prs[i];
    await db.runAsync(
      `INSERT INTO personal_records (id, user_id, exercise_id, exercise_name, weight, reps, achieved_at, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        null,
        `ex-${i}`,
        pr.exerciseName,
        pr.weight,
        pr.reps,
        pr.date.toISOString(),
        null,
      ]
    );
  }
};

export const initDatabase = async (): Promise<void> => {
  // Prevent multiple simultaneous initializations
  if (dbInitializing) {
    // Wait for existing initialization to complete
    while (dbInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  if (dbInitialized) {
    return;
  }

  dbInitializing = true;

  // On web, use in-memory storage
  if (isWeb) {
    if (!webInitialized) {
      generateWebSampleData();
      webInitialized = true;
      console.log("[Web] Database initialized with sample data");
    }
    dbInitialized = true;
    dbInitializing = false;
    return;
  }

  try {
    // On native, use SQLite
    SQLite = await import("expo-sqlite");
    if (!SQLite) {
      throw new Error("Failed to import expo-sqlite");
    }

    db = await SQLite.openDatabaseAsync("fittrack.db");
    if (!db) {
      throw new Error("Failed to open database");
    }
    console.log("[Database] Database opened successfully");
  } catch (error) {
    console.error("[Database] Database initialization error:", error);
    db = null;
    dbInitializing = false;
    throw error;
  }

  // Create tables
  if (!db) {
    dbInitializing = false;
    throw new Error("Database is null after opening");
  }

  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        equipment TEXT,
        description TEXT,
        image_url TEXT,
        is_custom INTEGER DEFAULT 0,
        user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted INTEGER DEFAULT 0,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        is_preset INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted INTEGER DEFAULT 0,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS template_exercises (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        display_order INTEGER,
        FOREIGN KEY (template_id) REFERENCES workout_templates(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        template_id TEXT,
        template_name TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_seconds INTEGER,
        total_volume REAL,
        synced_at TEXT,
        FOREIGN KEY (template_id) REFERENCES workout_templates(id)
      );

      CREATE TABLE IF NOT EXISTS exercise_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        exercise_name TEXT,
        completed_at TEXT,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY,
        exercise_log_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        is_pr INTEGER DEFAULT 0,
        logged_at TEXT NOT NULL,
        FOREIGN KEY (exercise_log_id) REFERENCES exercise_logs(id)
      );

      CREATE TABLE IF NOT EXISTS personal_records (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        exercise_id TEXT NOT NULL,
        exercise_name TEXT,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        achieved_at TEXT NOT NULL,
        session_id TEXT,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id),
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        weight REAL,
        chest REAL,
        waist REAL,
        hips REAL,
        left_arm REAL,
        right_arm REAL,
        left_thigh REAL,
        right_thigh REAL,
        notes TEXT,
        measured_at TEXT NOT NULL,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS streak_history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        week_start TEXT NOT NULL,
        workouts_completed INTEGER DEFAULT 0,
        goal_met INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } catch (error) {
    console.error("[Database] Table creation error:", error);
    db = null;
    dbInitializing = false;
    throw error;
  }

  // Seed data if needed
  try {
    await seedExercises();
    await seedTemplates();
    await seedWorkoutSessions();
  } catch (error) {
    console.error("[Database] Seeding error:", error);
    // Don't throw - seeding errors shouldn't prevent app from starting
  }

  dbInitialized = true;
  dbInitializing = false;
  console.log("[Database] Database initialized successfully");
};

// Ensure database is ready before operations
export const ensureDatabaseReady = async (): Promise<boolean> => {
  if (isWeb) {
    return webInitialized;
  }

  if (dbInitialized && db) {
    return true;
  }

  if (dbInitializing) {
    // Wait for initialization to complete
    let attempts = 0;
    while (dbInitializing && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    return dbInitialized && db !== null;
  }

  // Try to initialize if not already initialized
  try {
    await initDatabase();
    return db !== null;
  } catch (error) {
    console.error("[Database] Failed to ensure database ready:", error);
    return false;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

// Re-export for web sample data regeneration
export { generateWebSampleData, seedWorkoutSessions };
