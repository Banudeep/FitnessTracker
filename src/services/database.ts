import { Platform } from "react-native";
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  PersonalRecord,
  TemplateExercise,
} from "../types";
import { builtInExercises } from "../constants/exercises";
import { presetTemplates } from "../constants/templates";

// Check if we're on web
const isWeb = Platform.OS === "web";

// Only import SQLite on native platforms
let SQLite: typeof import("expo-sqlite") | null = null;
let db: import("expo-sqlite").SQLiteDatabase | null = null;
let dbInitialized = false;
let dbInitializing = false;

// In-memory storage for web
let webExercises: Exercise[] = [];
let webTemplates: WorkoutTemplate[] = [];
let webSessions: WorkoutSession[] = [];
let webPersonalRecords: PersonalRecord[] = [];
let webInitialized = false;

const generateId = () =>
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
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        is_preset INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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

  // Run migrations for existing databases
  try {
    await runMigrations();
  } catch (error) {
    console.error("[Database] Migration error:", error);
    // Don't throw - migrations shouldn't prevent app from starting
  }

  // Seed data if needed
  try {
    console.log("[Database] Seeding exercises...");
    await seedExercises();
    console.log("[Database] Exercises seeded.");
    
    console.log("[Database] Seeding templates...");
    await seedTemplates();
    console.log("[Database] Templates seeded.");

    // Disabled: Sample workout sessions cause sync issues when uploaded to cloud
    // await seedWorkoutSessions();
  } catch (error) {
    console.error("[Database] Seeding error:", error);
    // Don't throw - seeding errors shouldn't prevent app from starting
  }

  dbInitialized = true;
  dbInitializing = false;
  console.log("[Database] Database initialized successfully");
};

// Ensure database is ready before operations
const ensureDatabaseReady = async (): Promise<boolean> => {
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

// Database migration function
const runMigrations = async (): Promise<void> => {
  if (!db) return;

  console.log("[Database] Running migrations...");

  try {
    // Migration 1: Add deleted and deleted_at columns to tables
    // We wrap each implementation in try-catch because SQLite doesn't support IF NOT EXISTS for ADD COLUMN
    // and one failure aborts the whole execAsync block
    
    const safeAddColumn = async (table: string, column: string, definition: string) => {
      try {
        await db!.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      } catch (e: any) {
        if (!e.message?.includes("duplicate column")) {
          console.warn(`[Database] Failed to add column ${column} to ${table}:`, e);
        }
      }
    };

    // Workout Sessions
    await safeAddColumn("workout_sessions", "deleted", "INTEGER DEFAULT 0");
    await safeAddColumn("workout_sessions", "deleted_at", "TEXT");

    // Body Measurements
    await safeAddColumn("body_measurements", "deleted", "INTEGER DEFAULT 0");
    await safeAddColumn("body_measurements", "deleted_at", "TEXT");

    // Personal Records
    await safeAddColumn("personal_records", "deleted", "INTEGER DEFAULT 0");
    await safeAddColumn("personal_records", "deleted_at", "TEXT");
    await safeAddColumn("personal_records", "synced_at", "TEXT");

    // Exercises
    await safeAddColumn("exercises", "deleted", "INTEGER DEFAULT 0");
    await safeAddColumn("exercises", "deleted_at", "TEXT");
    await safeAddColumn("exercises", "synced_at", "TEXT");

    // Templates
    await safeAddColumn("workout_templates", "deleted", "INTEGER DEFAULT 0");
    await safeAddColumn("workout_templates", "deleted_at", "TEXT");
    await safeAddColumn("workout_templates", "synced_at", "TEXT");

    console.log("[Database] Migrations completed successfully");
  } catch (error: any) {
    // Ignore "duplicate column" errors - means migration already ran
    if (!error.message?.includes("duplicate column")) {
      console.error("[Database] Migration failed:", error);
      throw error;
    } else {
      console.log("[Database] Migrations already applied");
    }
  }
};

const seedExercises = async (): Promise<void> => {
  if (!db) return;

  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercises WHERE is_custom = 0"
  );

  if (count && count.count > 0) return;

  const now = new Date().toISOString();

  for (const exercise of builtInExercises) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO exercises (id, name, category, equipment, description, image_url, is_custom, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      exercise.name,
      exercise.category,
      exercise.equipment,
      exercise.description,
      exercise.imageUrl,
      now,
      now
    );
  }
};

const seedTemplates = async (): Promise<void> => {
  if (!db) return;

  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workout_templates WHERE is_preset = 1"
  );

  if (count && count.count > 0) return;

  const now = new Date().toISOString();

  for (const template of presetTemplates) {
    const templateId = generateId();

    await db.runAsync(
      `INSERT INTO workout_templates (id, name, is_preset, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`,
      templateId,
      template.name,
      now,
      now
    );

    for (let i = 0; i < template.exercises.length; i++) {
      const exerciseName = template.exercises[i];
      const exercise = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM exercises WHERE name = ?",
        exerciseName
      );

      if (exercise) {
        await db.runAsync(
          `INSERT INTO template_exercises (id, template_id, exercise_id, display_order)
           VALUES (?, ?, ?, ?)`,
          generateId(),
          templateId,
          exercise.id,
          i
        );
      }
    }
  }
};

// Seed sample workout sessions for the last 3 months
const seedWorkoutSessions = async (forceReseed: boolean = false): Promise<void> => {
  if (!db) return;

  // Ensure app_settings table exists (for existing databases)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Only check these conditions if not forcing reseed
  if (!forceReseed) {
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
  }

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

// Exercise queries
export const getAllExercises = async (): Promise<Exercise[]> => {
  if (isWeb) return webExercises;
  if (!db) return [];

  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    category: string;
    equipment: string;
    description: string;
    image_url: string | null;
    is_custom: number;
    user_id: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM exercises WHERE (deleted IS NULL OR deleted = 0) ORDER BY is_custom DESC, name");

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as Exercise["category"],
    equipment: row.equipment as Exercise["equipment"],
    description: row.description,
    imageUrl: row.image_url,
    isCustom: row.is_custom === 1,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
};

export const createExercise = async (
  exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">
): Promise<Exercise> => {
  const id = generateId();
  const now = new Date();

  if (isWeb) {
    // Check for duplicate name
    const existing = webExercises.find(
      (e) => e.name.toLowerCase() === exercise.name.toLowerCase().trim()
    );
    if (existing) {
      throw new Error(
        `An exercise with the name "${exercise.name.trim()}" already exists.`
      );
    }

    const newExercise: Exercise = {
      ...exercise,
      id,
      createdAt: now,
      updatedAt: now,
    };
    webExercises.push(newExercise);
    return newExercise;
  }

  if (!db) throw new Error("Database not initialized");

  // Check for duplicate name (case-insensitive)
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM exercises WHERE LOWER(name) = LOWER(?)",
    [exercise.name.trim()]
  );

  if (existing) {
    throw new Error(
      `An exercise with the name "${exercise.name.trim()}" already exists.`
    );
  }

  const nowStr = now.toISOString();

  await db.runAsync(
    `INSERT INTO exercises (id, name, category, equipment, description, image_url, is_custom, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      exercise.name.trim(),
      exercise.category,
      exercise.equipment,
      exercise.description,
      exercise.imageUrl,
      exercise.isCustom ? 1 : 0,
      exercise.userId,
      nowStr,
      nowStr,
    ]
  );

  return {
    ...exercise,
    id,
    createdAt: now,
    updatedAt: now,
  };
};

// Delete a custom exercise
export const deleteExercise = async (exerciseId: string): Promise<void> => {
  if (isWeb) {
    const index = webExercises.findIndex((e) => e.id === exerciseId);
    if (index >= 0) {
      const exercise = webExercises[index];
      // Only allow deletion of custom exercises
      if (exercise.isCustom) {
        webExercises.splice(index, 1);
      } else {
        throw new Error("Cannot delete built-in exercises");
      }
    }
    return;
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] deleteExercise: Database not ready");
    throw new Error("Database not ready");
  }

  try {
    // Check if exercise is custom
    const exercise = await db.getFirstAsync<{ is_custom: number }>(
      "SELECT is_custom FROM exercises WHERE id = ?",
      [exerciseId]
    );

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.is_custom !== 1) {
      throw new Error("Cannot delete built-in exercises");
    }

    // Soft delete
    const now = new Date().toISOString();
    await db.runAsync("UPDATE exercises SET deleted = 1, deleted_at = ? WHERE id = ?", [now, exerciseId]);
  } catch (error) {
    console.error("[Database] Error deleting exercise:", error);
    throw error;
  }
};

// Update a custom exercise
export const updateExercise = async (
  exerciseId: string,
  exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">
): Promise<Exercise> => {
  const now = new Date();

  if (isWeb) {
    const index = webExercises.findIndex((e) => e.id === exerciseId);
    if (index < 0) {
      throw new Error("Exercise not found");
    }

    const existing = webExercises[index];
    if (!existing.isCustom) {
      throw new Error("Cannot edit built-in exercises");
    }

    // Check for duplicate name (excluding current exercise)
    const duplicate = webExercises.find(
      (e) =>
        e.id !== exerciseId &&
        e.name.toLowerCase() === exercise.name.toLowerCase().trim()
    );
    if (duplicate) {
      throw new Error(
        `An exercise with the name "${exercise.name.trim()}" already exists.`
      );
    }

    const updated: Exercise = {
      ...exercise,
      id: exerciseId,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    webExercises[index] = updated;
    return updated;
  }

  if (!db) throw new Error("Database not initialized");

  // Check if exercise exists and is custom
  const existing = await db.getFirstAsync<{ is_custom: number }>(
    "SELECT is_custom FROM exercises WHERE id = ?",
    [exerciseId]
  );

  if (!existing) {
    throw new Error("Exercise not found");
  }

  if (existing.is_custom !== 1) {
    throw new Error("Cannot edit built-in exercises");
  }

  // Check for duplicate name (excluding current exercise)
  const duplicate = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) AND id != ?",
    [exercise.name.trim(), exerciseId]
  );

  if (duplicate) {
    throw new Error(
      `An exercise with the name "${exercise.name.trim()}" already exists.`
    );
  }

  const nowStr = now.toISOString();

  await db.runAsync(
    `UPDATE exercises 
     SET name = ?, category = ?, equipment = ?, description = ?, image_url = ?, updated_at = ?
     WHERE id = ?`,
    [
      exercise.name.trim(),
      exercise.category,
      exercise.equipment,
      exercise.description,
      exercise.imageUrl,
      nowStr,
      exerciseId,
    ]
  );

  const updated = await db.getFirstAsync<{
    id: string;
    name: string;
    category: string;
    equipment: string;
    description: string;
    image_url: string | null;
    is_custom: number;
    user_id: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM exercises WHERE id = ?", [exerciseId]);

  if (!updated) {
    throw new Error("Exercise not found after update");
  }

  return {
    id: updated.id,
    name: updated.name,
    category: updated.category as Exercise["category"],
    equipment: updated.equipment as Exercise["equipment"],
    description: updated.description,
    imageUrl: updated.image_url,
    isCustom: updated.is_custom === 1,
    userId: updated.user_id,
    createdAt: new Date(updated.created_at),
    updatedAt: new Date(updated.updated_at),
  };
};

// Template queries
export const getAllTemplates = async (): Promise<WorkoutTemplate[]> => {
  if (isWeb) return webTemplates;
  if (!db) return [];

  const templates = await db.getAllAsync<{
    id: string;
    user_id: string | null;
    name: string;
    is_preset: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM workout_templates WHERE (deleted IS NULL OR deleted = 0) ORDER BY is_preset DESC, name");

  const result: WorkoutTemplate[] = [];

  for (const template of templates) {
    const exercises = await db.getAllAsync<{
      te_id: string;
      template_id: string;
      exercise_id: string;
      display_order: number;
      e_id: string;
      name: string;
      category: string;
      equipment: string;
      description: string;
      image_url: string | null;
    }>(
      `
      SELECT 
        te.id as te_id, te.template_id, te.exercise_id, te.display_order,
        e.id as e_id, e.name, e.category, e.equipment, e.description, e.image_url
      FROM template_exercises te
      JOIN exercises e ON te.exercise_id = e.id
      WHERE te.template_id = ?
      ORDER BY te.display_order
    `,
      [template.id]
    );

    result.push({
      id: template.id,
      userId: template.user_id,
      name: template.name,
      isPreset: template.is_preset === 1,
      exercises: exercises.map((e) => ({
        id: e.te_id,
        templateId: e.template_id,
        exerciseId: e.exercise_id,
        displayOrder: e.display_order,
        exercise: {
          id: e.e_id,
          name: e.name,
          category: e.category as Exercise["category"],
          equipment: e.equipment as Exercise["equipment"],
          description: e.description,
          imageUrl: e.image_url,
          isCustom: false,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })),
      createdAt: new Date(template.created_at),
      updatedAt: new Date(template.updated_at),
    });
  }

  return result;
};

// Template save
export const saveTemplate = async (
  template: Omit<WorkoutTemplate, "id" | "createdAt" | "updatedAt">
): Promise<WorkoutTemplate> => {
  const id = generateId();
  const now = new Date();

  const newTemplate: WorkoutTemplate = {
    ...template,
    id,
    createdAt: now,
    updatedAt: now,
    exercises: template.exercises.map((e, index) => ({
      id: generateId(),
      templateId: id,
      exerciseId: e.exerciseId,
      displayOrder: index,
      exercise: e.exercise,
    })),
  };

  if (isWeb) {
    webTemplates.push(newTemplate);
    return newTemplate;
  }

  if (!db) throw new Error("Database not initialized");

  const nowStr = now.toISOString();

  await db.runAsync(
    `INSERT INTO workout_templates (id, user_id, name, is_preset, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      template.userId,
      template.name,
      template.isPreset ? 1 : 0,
      nowStr,
      nowStr,
    ]
  );

  for (const exercise of newTemplate.exercises) {
    await db.runAsync(
      `INSERT INTO template_exercises (id, template_id, exercise_id, display_order)
       VALUES (?, ?, ?, ?)`,
      [exercise.id, id, exercise.exerciseId, exercise.displayOrder]
    );
  }

  return newTemplate;
};

// Update a template
export const updateTemplate = async (
  templateId: string,
  template: Omit<
    WorkoutTemplate,
    "id" | "createdAt" | "updatedAt" | "exercises"
  > & {
    exercises: Omit<TemplateExercise, "id" | "templateId">[];
  }
): Promise<WorkoutTemplate> => {
  const now = new Date();
  const nowStr = now.toISOString();

  if (isWeb) {
    const index = webTemplates.findIndex((t) => t.id === templateId);
    if (index >= 0) {
      const updatedTemplate: WorkoutTemplate = {
        ...webTemplates[index],
        name: template.name,
        isPreset: template.isPreset,
        updatedAt: now,
        exercises: template.exercises.map((e, index) => ({
          id: generateId(),
          templateId,
          exerciseId: e.exerciseId,
          displayOrder: index,
          exercise: e.exercise,
        })),
      };
      webTemplates[index] = updatedTemplate;
      return updatedTemplate;
    }
    throw new Error("Template not found");
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] updateTemplate: Database not ready");
    throw new Error("Database not ready");
  }

  try {
    // Update template
    await db.runAsync(
      `UPDATE workout_templates 
       SET name = ?, is_preset = ?, updated_at = ?
       WHERE id = ?`,
      [template.name, template.isPreset ? 1 : 0, nowStr, templateId]
    );

    // Delete existing template exercises
    await db.runAsync("DELETE FROM template_exercises WHERE template_id = ?", [
      templateId,
    ]);

    // Insert new template exercises
    for (let index = 0; index < template.exercises.length; index++) {
      const exercise = template.exercises[index];
      const exerciseId = generateId();
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, display_order)
         VALUES (?, ?, ?, ?)`,
        [exerciseId, templateId, exercise.exerciseId, index]
      );
    }

    // Fetch and return updated template
    const updatedTemplateRow = await db.getFirstAsync<{
      id: string;
      user_id: string | null;
      name: string;
      is_preset: number;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM workout_templates WHERE id = ?`, [templateId]);

    if (!updatedTemplateRow) {
      throw new Error("Template not found after update");
    }

    const exerciseRows = await db.getAllAsync<{
      id: string;
      template_id: string;
      exercise_id: string;
      display_order: number;
    }>(
      `SELECT * FROM template_exercises WHERE template_id = ? ORDER BY display_order`,
      [templateId]
    );

    const exercises = await Promise.all(
      exerciseRows.map(async (row) => {
        const exerciseRow = await db.getFirstAsync<{
          id: string;
          name: string;
          category: string;
          muscle_groups: string;
        }>(`SELECT * FROM exercises WHERE id = ?`, [row.exercise_id]);

        if (!exerciseRow) {
          throw new Error(`Exercise ${row.exercise_id} not found`);
        }

        return {
          id: row.id,
          templateId: row.template_id,
          exerciseId: row.exercise_id,
          displayOrder: row.display_order,
          exercise: {
            id: exerciseRow.id,
            name: exerciseRow.name,
            category: exerciseRow.category,
            muscleGroups: exerciseRow.muscle_groups
              ? JSON.parse(exerciseRow.muscle_groups)
              : [],
          },
        };
      })
    );

    return {
      id: updatedTemplateRow.id,
      userId: updatedTemplateRow.user_id,
      name: updatedTemplateRow.name,
      isPreset: updatedTemplateRow.is_preset === 1,
      createdAt: new Date(updatedTemplateRow.created_at),
      updatedAt: new Date(updatedTemplateRow.updated_at),
      exercises,
    };
  } catch (error) {
    console.error("[Database] Error updating template:", error);
    throw error;
  }
};

// Delete a template (Soft Delete)
export const deleteTemplate = async (templateId: string): Promise<void> => {
  if (isWeb) {
    const index = webTemplates.findIndex((t) => t.id === templateId);
    if (index >= 0) {
      webTemplates[index].deleted = true;
      webTemplates[index].deletedAt = new Date();
    }
    return;
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] deleteTemplate: Database not ready");
    return;
  }

  try {
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE workout_templates SET deleted = 1, deleted_at = ? WHERE id = ?",
      [now, templateId]
    );
  } catch (error) {
    console.error("[Database] Error deleting template:", error);
    throw error;
  }
};

// Session queries
// Delete a set from the database
export const deleteSet = async (setId: string): Promise<void> => {
  if (isWeb) {
    // For web, we'll handle it through saveWorkoutSession
    return;
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] deleteSet: Database not ready");
    return;
  }

  try {
    await db.runAsync("DELETE FROM sets WHERE id = ?", [setId]);
  } catch (error) {
    console.error("[Database] Error deleting set:", error);
    // Don't throw - log and continue
  }
};

// Update a set in the database
export const updateSet = async (
  setId: string,
  weight: number,
  reps: number
): Promise<void> => {
  if (isWeb) {
    // For web, we'll handle it through saveWorkoutSession
    return;
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] updateSet: Database not ready");
    throw new Error("Database not ready");
  }

  try {
    await db.runAsync("UPDATE sets SET weight = ?, reps = ? WHERE id = ?", [
      weight,
      reps,
      setId,
    ]);
  } catch (error) {
    console.error("[Database] Error updating set:", error);
    throw error;
  }
};

export const saveWorkoutSession = async (
  session: WorkoutSession
): Promise<void> => {
  if (isWeb) {
    const existingIndex = webSessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      webSessions[existingIndex] = session;
    } else {
      webSessions.push(session);
    }
    return;
  }

  // Ensure database is ready
  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error(
      "[Database] saveWorkoutSession: Database not ready or not initialized"
    );
    // Don't throw - just log the error and return
    // This allows the app to continue functioning even if database operations fail
    return;
  }

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_sessions (id, user_id, template_id, template_name, started_at, completed_at, duration_seconds, total_volume, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.userId,
        session.templateId,
        session.templateName,
        session.startedAt.toISOString(),
        session.completedAt?.toISOString() || null,
        session.durationSeconds,
        session.totalVolume,
        session.syncedAt?.toISOString() || null,
      ]
    );

    for (const log of session.exerciseLogs) {
      await db.runAsync(
        `INSERT OR REPLACE INTO exercise_logs (id, session_id, exercise_id, exercise_name, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          log.id,
          session.id,
          log.exerciseId,
          log.exerciseName,
          log.completedAt?.toISOString() || null,
        ]
      );

      for (const set of log.sets) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sets (id, exercise_log_id, set_number, weight, reps, is_pr, logged_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            set.id,
            log.id,
            set.setNumber,
            set.weight,
            set.reps,
            set.isPR ? 1 : 0,
            set.loggedAt.toISOString(),
          ]
        );
      }
    }
  } catch (error) {
    console.error("[Database] Error saving workout session:", error);
    // Don't throw - log and continue to prevent app crashes
    // The data will be saved in memory and can be retried later
  }
};

export const deleteWorkoutSession = async (
  sessionId: string
): Promise<void> => {
  if (isWeb) {
    const session = webSessions.find((s) => s.id === sessionId);
    if (session) {
      session.deleted = true;
      session.deletedAt = new Date();
    }
    return;
  }

  // Ensure database is ready
  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error(
      "[Database] deleteWorkoutSession: Database not ready or not initialized"
    );
    throw new Error("Database not ready");
  }

  try {
    // Soft delete - mark as deleted instead of removing
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE workout_sessions SET deleted = 1, deleted_at = ? WHERE id = ?`,
      [now, sessionId]
    );
    console.log(`[Database] Soft deleted workout session: ${sessionId}`);
  } catch (error) {
    console.error("[Database] Error deleting workout session:", error);
    throw error;
  }
};

export const getRecentSessions = async (
  limit: number = 100
): Promise<WorkoutSession[]> => {
  if (isWeb) {
    return webSessions
      .filter((s) => !s.deleted && s.completedAt && s.templateName !== "Synthetic Workout")
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      )
      .slice(0, limit);
  }
  if (!db) return [];

  const sessions = await db.getAllAsync<{
    id: string;
    user_id: string | null;
    template_id: string | null;
    template_name: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    total_volume: number | null;
    synced_at: string | null;
    deleted: number | null;
    deleted_at: string | null;
  }>(
    `SELECT * FROM workout_sessions 
     WHERE (template_name IS NULL OR template_name != 'Synthetic Workout') 
     AND (deleted IS NULL OR deleted = 0)
     ORDER BY started_at DESC LIMIT ?`,
    [limit]
  );

  const result: WorkoutSession[] = [];

  for (const session of sessions) {
    const logs = await db.getAllAsync<{
      id: string;
      session_id: string;
      exercise_id: string;
      exercise_name: string;
      completed_at: string | null;
    }>("SELECT * FROM exercise_logs WHERE session_id = ?", [session.id]);

    const exerciseLogs = [];
    for (const log of logs) {
      const sets = await db.getAllAsync<{
        id: string;
        exercise_log_id: string;
        set_number: number;
        weight: number;
        reps: number;
        is_pr: number;
        logged_at: string;
      }>("SELECT * FROM sets WHERE exercise_log_id = ? ORDER BY set_number", [
        log.id,
      ]);

      exerciseLogs.push({
        id: log.id,
        sessionId: log.session_id,
        exerciseId: log.exercise_id,
        exerciseName: log.exercise_name,
        completedAt: log.completed_at ? new Date(log.completed_at) : null,
        sets: sets.map((s) => ({
          id: s.id,
          exerciseLogId: s.exercise_log_id,
          setNumber: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rpe: null,
          isPR: s.is_pr === 1,
          loggedAt: new Date(s.logged_at),
        })),
      });
    }

    result.push({
      id: session.id,
      userId: session.user_id,
      templateId: session.template_id,
      templateName: session.template_name,
      startedAt: new Date(session.started_at),
      completedAt: session.completed_at ? new Date(session.completed_at) : null,
      durationSeconds: session.duration_seconds,
      totalVolume: session.total_volume,
      syncedAt: session.synced_at ? new Date(session.synced_at) : null,
      deleted: session.deleted === 1,
      deletedAt: session.deleted_at ? new Date(session.deleted_at) : null,
      exerciseLogs,
    });
  }

  return result;
};

// Get deleted sessions for sync (tombstones)
export const getDeletedSessions = async (): Promise<WorkoutSession[]> => {
  if (isWeb) {
    return webSessions.filter((s) => s.deleted === true);
  }
  if (!db) return [];

  const sessions = await db.getAllAsync<{
    id: string;
    user_id: string | null;
    deleted_at: string;
  }>(
    `SELECT id, user_id, deleted_at FROM workout_sessions 
     WHERE deleted = 1`
  );

  return sessions.map((s) => ({
    id: s.id,
    userId: s.user_id,
    templateId: null,
    templateName: "",
    startedAt: new Date(),
    completedAt: null,
    durationSeconds: null,
    totalVolume: null,
    syncedAt: null,
    deleted: true,
    deletedAt: new Date(s.deleted_at),
    exerciseLogs: [],
  }));
};

// Permanently remove a deleted session from local database (after cloud sync)
export const hardDeleteLocalSession = async (sessionId: string): Promise<void> => {
  if (isWeb) {
    webSessions = webSessions.filter((s) => s.id !== sessionId);
    return;
  }
  if (!db) return;

  try {
    // Delete associated personal records
    await db.runAsync(`DELETE FROM personal_records WHERE session_id = ?`, [sessionId]);
    // Delete sets first
    await db.runAsync(
      `DELETE FROM sets WHERE exercise_log_id IN (SELECT id FROM exercise_logs WHERE session_id = ?)`,
      [sessionId]
    );
    // Delete exercise logs
    await db.runAsync(`DELETE FROM exercise_logs WHERE session_id = ?`, [sessionId]);
    // Delete the session
    await db.runAsync(`DELETE FROM workout_sessions WHERE id = ?`, [sessionId]);
  } catch (error) {
    console.error("[Database] Error hard-deleting session:", error);
  }
};

// Cleanup function to remove soft-deleted records that have been synced
export const cleanupDeletedRecords = async (): Promise<number> => {
  if (isWeb) return 0;
  if (!db) return 0;

  try {
    let deletedCount = 0;

    // 1. Delete synced deleted sessions
    const sessions = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_sessions WHERE deleted = 1 AND deleted_at IS NOT NULL"
    );
    
    for (const session of sessions) {
        // Find associated PRs first
        await db.runAsync("DELETE FROM personal_records WHERE session_id = ?", [session.id]);
        
        // Delete logs and sets
        await db.runAsync(
          "DELETE FROM sets WHERE exercise_log_id IN (SELECT id FROM exercise_logs WHERE session_id = ?)",
          [session.id]
        );
        await db.runAsync("DELETE FROM exercise_logs WHERE session_id = ?", [session.id]);
        
        // Finally delete the session
        await db.runAsync("DELETE FROM workout_sessions WHERE id = ?", [session.id]);
        deletedCount++;
    }

    // 2. Delete synced deleted templates
    const templates = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_templates WHERE deleted = 1 AND deleted_at IS NOT NULL"
    );
    
    for (const template of templates) {
        await db.runAsync("DELETE FROM template_exercises WHERE template_id = ?", [template.id]);
        await db.runAsync("DELETE FROM workout_templates WHERE id = ?", [template.id]);
        deletedCount++;
    }

    // 3. Delete synced deleted exercises
    const exercises = await db.getAllAsync<{ id: string }>(
        "SELECT id FROM exercises WHERE deleted = 1 AND deleted_at IS NOT NULL"
    );
    
    for (const exercise of exercises) {
        await db.runAsync("DELETE FROM exercises WHERE id = ?", [exercise.id]);
        deletedCount++;
    }

    console.log(`[Database] Cleanup complete. Removed ${deletedCount} records.`);
    return deletedCount;

  } catch (error) {
    console.error("[Database] Cleanup failed:", error);
    return 0;
  }
};

// Mark a session as synced (update syncedAt timestamp)
export const markSessionSynced = async (sessionId: string): Promise<void> => {
  if (isWeb) {
    const session = webSessions.find((s) => s.id === sessionId);
    if (session) {
      session.syncedAt = new Date();
    }
    return;
  }
  if (!db) return;

  try {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE workout_sessions SET synced_at = ? WHERE id = ?`,
      [now, sessionId]
    );
  } catch (error) {
    console.error("[Database] Error marking session as synced:", error);
  }
};

// Get last workout data for prefill
// Get active (incomplete) workout session for a specific template
export const getActiveWorkoutSessionByTemplate = async (
  templateId: string
): Promise<WorkoutSession | null> => {
  if (isWeb) {
    const activeSession = webSessions.find(
      (s) => !s.completedAt && s.templateId === templateId
    );
    return activeSession || null;
  }
  if (!db) return null;

  const session = await db.getFirstAsync<{
    id: string;
    user_id: string | null;
    template_id: string | null;
    template_name: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    total_volume: number | null;
    synced_at: string | null;
  }>(
    "SELECT * FROM workout_sessions WHERE completed_at IS NULL AND template_id = ? ORDER BY started_at DESC LIMIT 1",
    [templateId]
  );

  if (!session) return null;

  const logs = await db.getAllAsync<{
    id: string;
    session_id: string;
    exercise_id: string;
    exercise_name: string;
    completed_at: string | null;
  }>("SELECT * FROM exercise_logs WHERE session_id = ?", [session.id]);

  const exerciseLogs = [];
  for (const log of logs) {
    const sets = await db.getAllAsync<{
      id: string;
      exercise_log_id: string;
      set_number: number;
      weight: number;
      reps: number;
      is_pr: number;
      logged_at: string;
    }>("SELECT * FROM sets WHERE exercise_log_id = ? ORDER BY set_number", [
      log.id,
    ]);

    exerciseLogs.push({
      id: log.id,
      sessionId: log.session_id,
      exerciseId: log.exercise_id,
      exerciseName: log.exercise_name,
      completedAt: log.completed_at ? new Date(log.completed_at) : null,
      sets: sets.map((s) => ({
        id: s.id,
        exerciseLogId: s.exercise_log_id,
        setNumber: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rpe: null,
        isPR: s.is_pr === 1,
        loggedAt: new Date(s.logged_at),
      })),
    });
  }

  return {
    id: session.id,
    userId: session.user_id,
    templateId: session.template_id,
    templateName: session.template_name,
    startedAt: new Date(session.started_at),
    completedAt: session.completed_at ? new Date(session.completed_at) : null,
    durationSeconds: session.duration_seconds,
    totalVolume: session.total_volume,
    syncedAt: session.synced_at ? new Date(session.synced_at) : null,
    exerciseLogs,
  };
};

// Get active (incomplete) workout session (most recent one)
export const getActiveWorkoutSession =
  async (): Promise<WorkoutSession | null> => {
    if (isWeb) {
      const activeSession = webSessions.find((s) => !s.completedAt);
      return activeSession || null;
    }

    const isReady = await ensureDatabaseReady();
    if (!isReady || !db) {
      console.warn("[Database] getActiveWorkoutSession: Database not ready");
      return null;
    }

    const session = await db.getFirstAsync<{
      id: string;
      user_id: string | null;
      template_id: string | null;
      template_name: string;
      started_at: string;
      completed_at: string | null;
      duration_seconds: number | null;
      total_volume: number | null;
      synced_at: string | null;
    }>(
      "SELECT * FROM workout_sessions WHERE completed_at IS NULL ORDER BY started_at DESC LIMIT 1"
    );

    if (!session) return null;

    const logs = await db.getAllAsync<{
      id: string;
      session_id: string;
      exercise_id: string;
      exercise_name: string;
      completed_at: string | null;
    }>("SELECT * FROM exercise_logs WHERE session_id = ?", [session.id]);

    const exerciseLogs = [];
    for (const log of logs) {
      const sets = await db.getAllAsync<{
        id: string;
        exercise_log_id: string;
        set_number: number;
        weight: number;
        reps: number;
        is_pr: number;
        logged_at: string;
      }>("SELECT * FROM sets WHERE exercise_log_id = ? ORDER BY set_number", [
        log.id,
      ]);

      exerciseLogs.push({
        id: log.id,
        sessionId: log.session_id,
        exerciseId: log.exercise_id,
        exerciseName: log.exercise_name,
        completedAt: log.completed_at ? new Date(log.completed_at) : null,
        sets: sets.map((s) => ({
          id: s.id,
          exerciseLogId: s.exercise_log_id,
          setNumber: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rpe: null,
          isPR: s.is_pr === 1,
          loggedAt: new Date(s.logged_at),
        })),
      });
    }

    return {
      id: session.id,
      userId: session.user_id,
      templateId: session.template_id,
      templateName: session.template_name,
      startedAt: new Date(session.started_at),
      completedAt: session.completed_at ? new Date(session.completed_at) : null,
      durationSeconds: session.duration_seconds,
      totalVolume: session.total_volume,
      syncedAt: session.synced_at ? new Date(session.synced_at) : null,
      exerciseLogs,
    };
  };

// Get ALL active (incomplete) workout sessions
export const getAllActiveWorkoutSessions =
  async (): Promise<WorkoutSession[]> => {
    if (isWeb) {
      return webSessions.filter((s) => !s.completedAt);
    }

    const isReady = await ensureDatabaseReady();
    if (!isReady || !db) {
      console.warn("[Database] getAllActiveWorkoutSessions: Database not ready");
      return [];
    }

    const sessions = await db.getAllAsync<{
      id: string;
      user_id: string | null;
      template_id: string | null;
      template_name: string;
      started_at: string;
      completed_at: string | null;
      duration_seconds: number | null;
      total_volume: number | null;
      synced_at: string | null;
    }>(
      "SELECT * FROM workout_sessions WHERE completed_at IS NULL ORDER BY started_at DESC"
    );

    const results: WorkoutSession[] = [];
    
    for (const session of sessions) {
      const logs = await db.getAllAsync<{
        id: string;
        session_id: string;
        exercise_id: string;
        exercise_name: string;
        completed_at: string | null;
      }>("SELECT * FROM exercise_logs WHERE session_id = ?", [session.id]);

      const exerciseLogs = [];
      for (const log of logs) {
        const sets = await db.getAllAsync<{
          id: string;
          exercise_log_id: string;
          set_number: number;
          weight: number;
          reps: number;
          is_pr: number;
          logged_at: string;
        }>("SELECT * FROM sets WHERE exercise_log_id = ? ORDER BY set_number", [
          log.id,
        ]);

        exerciseLogs.push({
          id: log.id,
          sessionId: log.session_id,
          exerciseId: log.exercise_id,
          exerciseName: log.exercise_name,
          completedAt: log.completed_at ? new Date(log.completed_at) : null,
          sets: sets.map((s) => ({
            id: s.id,
            exerciseLogId: s.exercise_log_id,
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
            rpe: null,
            isPR: s.is_pr === 1,
            loggedAt: new Date(s.logged_at),
          })),
        });
      }

      results.push({
        id: session.id,
        userId: session.user_id,
        templateId: session.template_id,
        templateName: session.template_name,
        startedAt: new Date(session.started_at),
        completedAt: null,
        durationSeconds: session.duration_seconds,
        totalVolume: session.total_volume,
        syncedAt: session.synced_at ? new Date(session.synced_at) : null,
        exerciseLogs,
      });
    }

    return results;
  };

export const getLastWorkoutForTemplate = async (
  templateId: string
): Promise<WorkoutSession | null> => {
  if (isWeb) {
    const sessions = webSessions
      .filter((s) => s.templateId === templateId && s.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      );
    return sessions[0] || null;
  }
  if (!db) return null;

  const session = await db.getFirstAsync<{
    id: string;
    user_id: string | null;
    template_id: string | null;
    template_name: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    total_volume: number | null;
    synced_at: string | null;
  }>(
    "SELECT * FROM workout_sessions WHERE template_id = ? ORDER BY started_at DESC LIMIT 1",
    [templateId]
  );

  if (!session) return null;

  const logs = await db.getAllAsync<{
    id: string;
    session_id: string;
    exercise_id: string;
    exercise_name: string;
    completed_at: string | null;
  }>("SELECT * FROM exercise_logs WHERE session_id = ?", [session.id]);

  const exerciseLogs = [];
  for (const log of logs) {
    const sets = await db.getAllAsync<{
      id: string;
      exercise_log_id: string;
      set_number: number;
      weight: number;
      reps: number;
      is_pr: number;
      logged_at: string;
    }>("SELECT * FROM sets WHERE exercise_log_id = ? ORDER BY set_number", [
      log.id,
    ]);

    exerciseLogs.push({
      id: log.id,
      sessionId: log.session_id,
      exerciseId: log.exercise_id,
      exerciseName: log.exercise_name,
      completedAt: log.completed_at ? new Date(log.completed_at) : null,
      sets: sets.map((s) => ({
        id: s.id,
        exerciseLogId: s.exercise_log_id,
        setNumber: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rpe: null,
        isPR: s.is_pr === 1,
        loggedAt: new Date(s.logged_at),
      })),
    });
  }

  return {
    id: session.id,
    userId: session.user_id,
    templateId: session.template_id,
    templateName: session.template_name,
    startedAt: new Date(session.started_at),
    completedAt: session.completed_at ? new Date(session.completed_at) : null,
    durationSeconds: session.duration_seconds,
    totalVolume: session.total_volume,
    syncedAt: session.synced_at ? new Date(session.synced_at) : null,
    exerciseLogs,
  };
};

// Get comprehensive exercise analytics
export const getExerciseAnalytics = async (
  exerciseId: string
): Promise<{
  totalWorkouts: number;
  averageWeight: number;
  maxWeight: number;
  averageReps: number;
  totalVolume: number;
  weightProgression: Array<{
    date: Date;
    weight: number;
    reps: number;
    volume: number;
  }>;
}> => {
  if (isWeb) {
    const sessions = webSessions
      .filter((s) => s.completedAt)
      .sort(
        (a, b) =>
          new Date(a.completedAt!).getTime() -
          new Date(b.completedAt!).getTime()
      );

    const progression: Array<{
      date: Date;
      weight: number;
      reps: number;
      volume: number;
    }> = [];
    let totalWeight = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let maxWeight = 0;
    let workoutCount = 0;
    let totalSets = 0;

    for (const session of sessions) {
      const log = session.exerciseLogs.find((l) => l.exerciseId === exerciseId);
      if (log && log.sets.length > 0) {
        workoutCount++;
        
        // Add each set as a separate entry in progression (all sets, not just one per session)
        log.sets.forEach((set) => {
          totalWeight += set.weight;
          totalReps += set.reps;
          totalVolume += set.weight * set.reps;
          totalSets++;
          maxWeight = Math.max(maxWeight, set.weight);

          progression.push({
            date: set.loggedAt || session.completedAt!,
            weight: set.weight,
            reps: set.reps,
            volume: set.weight * set.reps,
          });
        });
      }
    }

    return {
      totalWorkouts: workoutCount,
      averageWeight: totalSets > 0 ? totalWeight / totalSets : 0,
      maxWeight,
      averageReps: totalSets > 0 ? totalReps / totalSets : 0,
      totalVolume,
      weightProgression: progression,
    };
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] getExerciseAnalytics: Database not ready");
    return {
      totalWorkouts: 0,
      averageWeight: 0,
      maxWeight: 0,
      averageReps: 0,
      totalVolume: 0,
      weightProgression: [],
    };
  }

  try {
    // Get all completed sessions with this exercise
    const sessions = await db.getAllAsync<{
      id: string;
      completed_at: string;
    }>(
      `SELECT DISTINCT ws.id, ws.completed_at
       FROM workout_sessions ws
       JOIN exercise_logs el ON ws.id = el.session_id
       WHERE el.exercise_id = ? AND ws.completed_at IS NOT NULL
       ORDER BY ws.completed_at ASC`,
      [exerciseId]
    );

    const progression: Array<{
      date: Date;
      weight: number;
      reps: number;
      volume: number;
    }> = [];
    let totalWeight = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let maxWeight = 0;
    let workoutCount = 0;
    let totalSets = 0;

    for (const session of sessions) {
      const log = await db.getFirstAsync<{
        id: string;
      }>(
        "SELECT id FROM exercise_logs WHERE session_id = ? AND exercise_id = ?",
        [session.id, exerciseId]
      );

      if (log) {
        const sets = await db.getAllAsync<{
          weight: number;
          reps: number;
          logged_at: string;
        }>(
          "SELECT weight, reps, logged_at FROM sets WHERE exercise_log_id = ? ORDER BY set_number",
          [log.id]
        );

        if (sets.length > 0) {
          workoutCount++;
          
          // Add each set as a separate entry in progression (all sets, not just one per session)
          for (const set of sets) {
            totalWeight += set.weight;
            totalReps += set.reps;
            totalVolume += set.weight * set.reps;
            totalSets++;
            maxWeight = Math.max(maxWeight, set.weight);

            progression.push({
              date: new Date(set.logged_at || session.completed_at), // use set time or session time
              weight: set.weight,
              reps: set.reps,
              volume: set.weight * set.reps,
            });
          }
        }
      }
    }

    return {
      totalWorkouts: workoutCount,
      averageWeight: totalSets > 0 ? totalWeight / totalSets : 0,
      maxWeight,
      averageReps: totalSets > 0 ? totalReps / totalSets : 0,
      totalVolume,
      weightProgression: progression,
    };
  } catch (error) {
    console.error("[Database] Error getting exercise analytics:", error);
    return {
      totalWorkouts: 0,
      averageWeight: 0,
      maxWeight: 0,
      averageReps: 0,
      totalVolume: 0,
      weightProgression: [],
    };
  }
};

// Get recent weight history for an exercise (last 5-10 sessions)
export const getRecentExerciseHistory = async (
  exerciseId: string,
  limit: number = 10
): Promise<Array<{ weight: number; reps: number; date: Date }>> => {
  if (isWeb) {
    // For web, get from in-memory sessions
    const sessions = webSessions
      .filter((s) => s.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      )
      .slice(0, limit);

    const history: Array<{ weight: number; reps: number; date: Date }> = [];
    for (const session of sessions) {
      const log = session.exerciseLogs.find((l) => l.exerciseId === exerciseId);
      if (log && log.sets.length > 0) {
        // Get all sets from the session
        log.sets.forEach((set) => {
          history.push({
            weight: set.weight,
            reps: set.reps,
            date: session.completedAt!,
          });
        });
      }
    }
    return history;
  }

  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error("[Database] getRecentExerciseHistory: Database not ready");
    return [];
  }

  try {
    // Get recent completed sessions that contain this exercise
    const sessions = await db.getAllAsync<{
      id: string;
      completed_at: string;
    }>(
      `SELECT DISTINCT ws.id, ws.completed_at
       FROM workout_sessions ws
       JOIN exercise_logs el ON ws.id = el.session_id
       WHERE el.exercise_id = ? AND ws.completed_at IS NOT NULL
       ORDER BY ws.completed_at DESC
       LIMIT ?`,
      [exerciseId, limit]
    );

    const history: Array<{ weight: number; reps: number; date: Date }> = [];
    for (const session of sessions) {
      const log = await db.getFirstAsync<{
        id: string;
      }>(
        "SELECT id FROM exercise_logs WHERE session_id = ? AND exercise_id = ?",
        [session.id, exerciseId]
      );

      if (log) {
        const sets = await db.getAllAsync<{
          weight: number;
          reps: number;
        }>(
          "SELECT weight, reps FROM sets WHERE exercise_log_id = ? ORDER BY set_number",
          [log.id]
        );

        for (const set of sets) {
          history.push({
            weight: set.weight,
            reps: set.reps,
            date: new Date(session.completed_at),
          });
        }
      }
    }

    return history;
  } catch (error) {
    console.error("[Database] Error getting recent exercise history:", error);
    return [];
  }
};

// Generate synthetic workout data for an exercise (for testing/demo)
export const generateSyntheticExerciseData = async (
  exerciseId: string,
  exerciseName: string
): Promise<void> => {
  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error(
      "[Database] generateSyntheticExerciseData: Database not ready"
    );
    return;
  }

  try {
    // Get or create a template for this exercise
    let templateId = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM workout_templates WHERE name = ? LIMIT 1",
      ["Synthetic Workout"]
    );

    if (!templateId) {
      templateId = { id: generateId() };
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO workout_templates (id, user_id, name, is_preset, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [templateId.id, null, "Synthetic Workout", 0, now, now]
      );
    }

    // Generate workout sessions for the last 8 weeks (2-3 workouts per week)
    const now = new Date();
    const sessions: Array<{ date: Date; weight: number; reps: number[] }> = [];

    // Create progression: start lighter, gradually increase (always increasing)
    let baseWeight = 100;
    let sessionIndex = 0; // Track total session count for smooth progression
    for (let week = 8; week >= 1; week--) {
      const workoutsPerWeek = week % 2 === 0 ? 2 : 3; // Alternate 2-3 workouts
      for (let workout = 0; workout < workoutsPerWeek; workout++) {
        const daysAgo = (week - 1) * 7 + workout * 2;
        const sessionDate = new Date(now);
        sessionDate.setDate(sessionDate.getDate() - daysAgo);
        sessionDate.setHours(18, 0, 0, 0); // 6 PM

        const completedDate = new Date(sessionDate);
        completedDate.setHours(19, 30, 0, 0); // 1.5 hours later

        // Progressive weight increase: always increase by a small amount per session
        // Start at baseWeight and increase by 2-3 lbs per session
        const weight = baseWeight + sessionIndex * 2.5;
        const reps = [10, 8, 6, 5]; // Typical rep scheme

        sessions.push({
          date: sessionDate,
          weight: Math.round(weight),
          reps,
        });
        sessionIndex++;
      }
    }

    // Create workout sessions
    for (const sessionData of sessions) {
      const sessionId = generateId();
      const duration = 90 * 60; // 90 minutes in seconds
      const totalVolume = sessionData.reps.reduce(
        (sum, r) => sum + sessionData.weight * r,
        0
      );

      // Check if session already exists (avoid duplicates)
      const existingSession = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM workout_sessions WHERE started_at = ? AND template_id = ? LIMIT 1",
        [sessionData.date.toISOString(), templateId.id]
      );

      if (!existingSession) {
        // Insert workout session
        await db.runAsync(
          `INSERT INTO workout_sessions (id, user_id, template_id, template_name, started_at, completed_at, duration_seconds, total_volume, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionId,
            null,
            templateId.id,
            "Synthetic Workout",
            sessionData.date.toISOString(),
            sessionData.date.toISOString(), // Completed same day
            duration,
            totalVolume,
            null,
          ]
        );

        // Insert exercise log
        const logId = generateId();
        await db.runAsync(
          `INSERT INTO exercise_logs (id, session_id, exercise_id, exercise_name, completed_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            logId,
            sessionId,
            exerciseId,
            exerciseName,
            sessionData.date.toISOString(),
          ]
        );

        // Insert sets - weights increase slightly within each session for smooth progression
        for (let setNum = 0; setNum < sessionData.reps.length; setNum++) {
          const setId = generateId();
          // Each set increases by 2.5 lbs within the session for smooth progression
          const setWeight = sessionData.weight + setNum * 2.5;
          await db.runAsync(
            `INSERT INTO sets (id, exercise_log_id, set_number, weight, reps, is_pr, logged_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              setId,
              logId,
              setNum + 1,
              Math.round(setWeight),
              sessionData.reps[setNum],
              0,
              sessionData.date.toISOString(),
            ]
          );
        }
      }
    }

    console.log(
      `[Database] Generated ${sessions.length} synthetic workout sessions for ${exerciseName}`
    );
  } catch (error) {
    console.error(
      "[Database] Error generating synthetic exercise data:",
      error
    );
  }
};

// Generate synthetic data based on user's actual workout routine
export const generateRoutineBasedSyntheticData = async (): Promise<void> => {
  const isReady = await ensureDatabaseReady();
  if (!isReady || !db) {
    console.error(
      "[Database] generateRoutineBasedSyntheticData: Database not ready"
    );
    return;
  }

  try {
    // Define workout routine with exercise name mappings and weight progressions
    const routine = {
      "Day 1 - Lower Body": [
        {
          name: "Leg Press",
          weights: [70, 85, 100, 130, 145, 155],
          reps: [12, 10, 8, 8, 6, 5],
        },
        {
          name: "Leg Extension",
          weights: [70, 85, 90, 100, 120],
          reps: [12, 10, 10, 8, 6],
        },
        {
          name: "Leg Curl",
          weights: [55, 85, 90, 100, 115, 120],
          reps: [12, 10, 10, 8, 6, 5],
        },
        { name: "Hip Abduction", weights: [130, 160, 190], reps: [15, 12, 10] },
        { name: "Calf Raise", weights: [90, 100], reps: [15, 12] },
      ],
      "Day 2 - Upper Push": [
        {
          name: "Chest Press Machine",
          weights: [30, 40, 50, 55, 60],
          reps: [12, 10, 8, 8, 6],
        },
        { name: "Pec Deck", weights: [55, 60, 70, 75], reps: [12, 10, 8, 6] },
        { name: "Barbell Bench Press", weights: [55], reps: [8] },
        { name: "Incline Barbell Bench Press", weights: [45], reps: [8] },
        { name: "Overhead Tricep Extension", weights: [10], reps: [12] },
        { name: "Tricep Extension", weights: [40], reps: [10] },
        { name: "Tricep Pushdown", weights: [65, 70], reps: [10, 8] },
      ],
      "Day 3 - Upper Pull": [
        { name: "Lat Pulldown", weights: [70, 80], reps: [10, 8] },
        {
          name: "Rear Delt Fly",
          weights: [40, 55, 60, 80],
          reps: [12, 10, 8, 6],
        },
        { name: "Barbell Curl", weights: [40, 30, 50], reps: [10, 12, 8] },
        { name: "Machine Row", weights: [60, 70, 75], reps: [10, 8, 8] },
        { name: "Seated Cable Row", weights: [85], reps: [8] },
        { name: "Close Grip Lat Pulldown", weights: [85], reps: [8] },
        { name: "Incline Dumbbell Curl", weights: [20], reps: [10] },
        { name: "Preacher Curl", weights: [30], reps: [10] },
      ],
      "Day 4 - Shoulders & Abs": [
        {
          name: "Machine Shoulder Press",
          weights: [20, 25, 30, 40],
          reps: [12, 10, 8, 6],
        },
        { name: "Front Raise", weights: [20], reps: [12] },
        { name: "Lateral Raise", weights: [10], reps: [12] },
        { name: "Crunches", weights: [60], reps: [20] },
        { name: "Cable Crunch", weights: [85, 115], reps: [15, 12] },
        { name: "Russian Twist", weights: [115], reps: [20] },
        { name: "Ab Wheel Rollout", weights: [90], reps: [10] },
      ],
    };

    // Get all exercises to match names
    const allExercises = await getAllExercises();

    // Helper to find exercise by name (fuzzy match)
    const findExercise = (name: string): Exercise | null => {
      const normalized = name
        .toLowerCase()
        .replace(
          /machine|press|extension|curl|raise|fly|pulldown|row|abduction|curl|crunch|twist|rollout/gi,
          ""
        )
        .trim();
      return (
        allExercises.find((ex) => {
          const exName = ex.name.toLowerCase();
          return (
            exName.includes(normalized) ||
            normalized.includes(exName.split(" ")[0])
          );
        }) || null
      );
    };

    // Generate data for last 8 weeks (4 workouts per week, rotating through days)
    const now = new Date();
    const days = [
      "Day 1 - Lower Body",
      "Day 2 - Upper Push",
      "Day 3 - Upper Pull",
      "Day 4 - Shoulders & Abs",
    ];

    // Get or create templates for each day
    const templates: Record<string, string> = {};
    for (const day of days) {
      let templateId = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM workout_templates WHERE name = ? LIMIT 1",
        [day]
      );
      if (!templateId) {
        templateId = { id: generateId() };
        const templateDate = new Date().toISOString();
        await db.runAsync(
          `INSERT INTO workout_templates (id, user_id, name, is_preset, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [templateId.id, null, day, 0, templateDate, templateDate]
        );
      }
      templates[day] = templateId.id;
    }

    let sessionCount = 0;
    // Generate 8 weeks of data (32 workouts total, 4 per week)
    for (let week = 8; week >= 1; week--) {
      for (let dayIndex = 0; dayIndex < 4; dayIndex++) {
        const day = days[dayIndex];
        const daysAgo = (week - 1) * 7 + dayIndex;
        const sessionDate = new Date(now);
        sessionDate.setDate(sessionDate.getDate() - daysAgo);
        sessionDate.setHours(18, 0, 0, 0);

        const completedDate = new Date(sessionDate);
        completedDate.setHours(19, 30, 0, 0);

        const sessionId = generateId();
        const templateId = templates[day];
        let totalVolume = 0;
        const exerciseLogs: Array<{
          exerciseId: string;
          exerciseName: string;
          sets: Array<{ weight: number; reps: number }>;
        }> = [];

        // Process each exercise in the day
        for (const exerciseData of routine[day as keyof typeof routine]) {
          const exercise = findExercise(exerciseData.name);
          if (!exercise) {
            console.warn(`[Database] Exercise not found: ${exerciseData.name}`);
            continue;
          }

          // Use weights with smooth progression over time (always increasing)
          // Calculate base progression factor based on week and day
          const weekProgress = (8 - week) * 0.02; // 2% increase per week
          const dayProgress = dayIndex * 0.005; // Small increase per day within week
          const progressFactor = 1 + weekProgress + dayProgress;

          // For each set, ensure weights increase within the session too
          const weightProgression = exerciseData.weights.map((w, i) => {
            // Base weight with weekly progression, plus small increase per set
            const setProgress = i * 0.01; // Small increase per set (1% per set)
            return Math.round(w * progressFactor * (1 + setProgress));
          });

          const sets = weightProgression.map((weight, setIndex) => ({
            weight,
            reps:
              exerciseData.reps[setIndex] ||
              exerciseData.reps[exerciseData.reps.length - 1],
          }));

          const exerciseVolume = sets.reduce(
            (sum, s) => sum + s.weight * s.reps,
            0
          );
          totalVolume += exerciseVolume;

          exerciseLogs.push({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            sets,
          });
        }

        if (exerciseLogs.length === 0) continue;

        // Check if session already exists
        const existingSession = await db.getFirstAsync<{ id: string }>(
          "SELECT id FROM workout_sessions WHERE started_at = ? AND template_id = ? LIMIT 1",
          [sessionDate.toISOString(), templateId]
        );

        if (!existingSession) {
          // Insert workout session
          await db.runAsync(
            `INSERT INTO workout_sessions (id, user_id, template_id, template_name, started_at, completed_at, duration_seconds, total_volume, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sessionId,
              null,
              templateId,
              day,
              sessionDate.toISOString(),
              completedDate.toISOString(),
              90 * 60, // 90 minutes
              totalVolume,
              null,
            ]
          );

          // Insert exercise logs and sets
          for (const log of exerciseLogs) {
            const logId = generateId();
            await db.runAsync(
              `INSERT INTO exercise_logs (id, session_id, exercise_id, exercise_name, completed_at)
               VALUES (?, ?, ?, ?, ?)`,
              [
                logId,
                sessionId,
                log.exerciseId,
                log.exerciseName,
                completedDate.toISOString(),
              ]
            );

            for (let setNum = 0; setNum < log.sets.length; setNum++) {
              const setId = generateId();
              await db.runAsync(
                `INSERT INTO sets (id, exercise_log_id, set_number, weight, reps, is_pr, logged_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  setId,
                  logId,
                  setNum + 1,
                  log.sets[setNum].weight,
                  log.sets[setNum].reps,
                  0,
                  sessionDate.toISOString(),
                ]
              );
            }
          }
          sessionCount++;
        }
      }
    }

    console.log(
      `[Database] Generated ${sessionCount} synthetic workout sessions based on routine`
    );
  } catch (error) {
    console.error(
      "[Database] Error generating routine-based synthetic data:",
      error
    );
  }
};

// Personal Records
export const getPersonalRecords = async (): Promise<PersonalRecord[]> => {
  if (isWeb) return webPersonalRecords;
  if (!db) return [];

  const rows = await db.getAllAsync<{
    id: string;
    user_id: string | null;
    exercise_id: string;
    exercise_name: string;
    weight: number;
    reps: number;
    achieved_at: string;
    session_id: string | null;
    synced_at: string | null;
  }>("SELECT * FROM personal_records WHERE (deleted IS NULL OR deleted = 0) ORDER BY achieved_at DESC");

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    achievedAt: new Date(row.achieved_at),
    sessionId: row.session_id,
    syncedAt: row.synced_at ? new Date(row.synced_at) : null,
  }));
};

// Mark a personal record as synced
export const markRecordSynced = async (recordId: string): Promise<void> => {
  if (isWeb) {
    const record = webPersonalRecords.find((r) => r.id === recordId);
    if (record) {
      (record as any).syncedAt = new Date();
    }
    return;
  }
  if (!db) return;

  try {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE personal_records SET synced_at = ? WHERE id = ?`,
      [now, recordId]
    );
  } catch (error) {
    console.error("[Database] Error marking record as synced:", error);
  }
};

export const savePersonalRecord = async (
  record: PersonalRecord
): Promise<void> => {
  if (isWeb) {
    webPersonalRecords.push(record);
    return;
  }
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(
    `INSERT OR REPLACE INTO personal_records (id, user_id, exercise_id, exercise_name, weight, reps, achieved_at, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.userId,
      record.exerciseId,
      record.exerciseName,
      record.weight,
      record.reps,
      record.achievedAt.toISOString(),
      record.sessionId,
    ]
  );
};

export const recalculatePersonalRecords = async (): Promise<PersonalRecord[]> => {
  if (isWeb) {
    // For web, we'll scan webSessions to rebuild webPersonalRecords
    webPersonalRecords = [];
    const bests = new Map<string, PersonalRecord>();

    webSessions.forEach(session => {
      session.exerciseLogs.forEach(log => {
        log.sets.forEach(set => {
          const existing = bests.get(log.exerciseId);
          // Logic: Heavier is better. Same weight? More reps is better.
          const isBetter = !existing || 
            set.weight > existing.weight || 
            (set.weight === existing.weight && set.reps > existing.reps);

          if (isBetter) {
            bests.set(log.exerciseId, {
              id: generateId(),
              userId: session.userId,
              exerciseId: log.exerciseId,
              exerciseName: log.exerciseName,
              weight: set.weight,
              reps: set.reps,
              achievedAt: set.loggedAt,
              sessionId: session.id
            });
          }
        });
      });
    });
    
    webPersonalRecords = Array.from(bests.values());
    return webPersonalRecords;
  }

  if (!db) throw new Error("Database not initialized");

  try {
    // 1. Clear existing PRs
    await db.runAsync('DELETE FROM personal_records');

    // 2. Find max weight for each exercise from history
    // We use a subquery to find the max weight, then join back to get reps and date
    // Note: This simple aggregation might pick an arbitrary row if there are ties for max weight.
    // To solve ties (prefer more reps), we can sort.
    
    // Efficient approach: Get ALL highest weight sets for every exercise
    const rows = await db.getAllAsync<{
      exercise_id: string;
      exercise_name: string;
      weight: number;
      reps: number;
      logged_at: string;
      session_id: string;
      user_id: string | null;
    }>(`
      SELECT 
        el.exercise_id, 
        el.exercise_name, 
        s.weight, 
        s.reps, 
        s.logged_at, 
        el.session_id,
        ws.user_id
      FROM sets s
      JOIN exercise_logs el ON s.exercise_log_id = el.id
      JOIN workout_sessions ws ON el.session_id = ws.id
      ORDER BY s.weight DESC, s.reps DESC
    `);

    // Process in JS to pick the distinct best per exercise
    // (SQLite's GROUP BY behavior with non-aggregated columns is unpredictable/non-standard across versions, so JS is safer for "top-n-per-group")
    const bests = new Map<string, any>();
    
    for (const row of rows) {
      if (!bests.has(row.exercise_id)) {
        bests.set(row.exercise_id, row);
      }
    }

    // 3. Insert new PRs
    const newRecords: PersonalRecord[] = [];
    
    for (const row of bests.values()) {
       const id = generateId();
       await db.runAsync(
        `INSERT INTO personal_records (id, user_id, exercise_id, exercise_name, weight, reps, achieved_at, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          row.user_id,
          row.exercise_id,
          row.exercise_name,
          row.weight,
          row.reps,
          row.logged_at,
          row.session_id
        ]
      );

      newRecords.push({
        id,
        userId: row.user_id,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        weight: row.weight,
        reps: row.reps,
        achievedAt: new Date(row.logged_at),
        sessionId: row.session_id
      });
    }

    return newRecords;
  } catch (error) {
    console.error("Failed to recalculate PRs:", error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

// Clear only sample workout data (Oct-Dec 2025), keeping real user workouts from January onwards
export const clearAllSampleData = async (): Promise<{
  deletedCount: number;
}> => {
  if (isWeb) {
    // Only delete workouts from Oct 1, 2025 to Dec 31, 2025
    const startDate = new Date(2025, 9, 1); // Oct 1, 2025
    const endDate = new Date(2025, 11, 31, 23, 59, 59); // Dec 31, 2025 end of day
    let deletedCount = 0;
    webSessions.forEach((s) => {
      if (!s.completedAt) return;
      const completedDate = new Date(s.completedAt);
      if (completedDate >= startDate && completedDate <= endDate) {
        s.deleted = true;
        s.deletedAt = new Date();
        deletedCount++;
      }
    });
    return { deletedCount };
  }

  if (!db) throw new Error("Database not initialized");

  try {
    // Get count of sessions in Oct-Dec 2025 only (not already deleted)
    const countResult = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM workout_sessions 
      WHERE completed_at >= '2025-10-01' AND completed_at < '2026-01-01'
      AND (deleted IS NULL OR deleted = 0)
    `);
    const deletedCount = countResult?.count || 0;

    console.log(
      "[Database] Found",
      deletedCount,
      "sample sessions to delete (Oct-Dec 2025)"
    );

    const now = new Date().toISOString();

    // Soft delete Oct-Dec 2025 workout sessions (mark as deleted instead of removing)
    await db.runAsync(`
      UPDATE workout_sessions 
      SET deleted = 1, deleted_at = ?
      WHERE completed_at >= '2025-10-01' AND completed_at < '2026-01-01'
      AND (deleted IS NULL OR deleted = 0)
    `, [now]);

    // Soft delete Oct-Dec 2025 personal records
    await db.runAsync(`
      UPDATE personal_records
      SET deleted = 1, deleted_at = ?, synced_at = ?
      WHERE achieved_at >= '2025-10-01' AND achieved_at < '2026-01-01'
      AND (deleted IS NULL OR deleted = 0)
    `, [now, now]);

    // Set flag to prevent re-seeding on next app start
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('sample_data_cleared', 'true')`
    );

    console.log(
      `[Database] Cleared ${deletedCount} sample workout sessions (Oct-Dec 2025)`
    );
    return { deletedCount };
  } catch (error) {
    console.error("[Database] Error clearing sample data:", error);
    throw error;
  }
};

// Reset workout data and re-seed with fresh sample data (preserves Jan 2026+ data)
export const resetWorkoutData = async (): Promise<void> => {
  if (isWeb) {
    // Preserve January 2026+ sessions
    const cutoffDate = new Date(2026, 0, 1); // Jan 1, 2026
    const preservedSessions = webSessions.filter(
      (s) => s.completedAt && new Date(s.completedAt) >= cutoffDate
    );
    generateWebSampleData();
    // Merge preserved sessions back
    webSessions = [...webSessions, ...preservedSessions];
    return;
  }
  if (!db) throw new Error("Database not initialized");

  console.log(
    "[Database] Resetting sample workout data (preserving Jan 2026+)..."
  );

  // Ensure app_settings table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Clear the "sample data cleared" flag FIRST so seeding will work
  await db.runAsync(
    `DELETE FROM app_settings WHERE key = 'sample_data_cleared'`
  );
  console.log("[Database] Cleared sample_data_cleared flag");

  // Delete only Oct-Dec 2025 workout data (preserve Jan 2026+)
  await db.runAsync(`
    DELETE FROM sets WHERE exercise_log_id IN (
      SELECT el.id FROM exercise_logs el
      INNER JOIN workout_sessions ws ON el.session_id = ws.id
      WHERE ws.completed_at >= '2025-10-01' AND ws.completed_at < '2026-01-01'
    )
  `);
  await db.runAsync(`
    DELETE FROM exercise_logs WHERE session_id IN (
      SELECT id FROM workout_sessions 
      WHERE completed_at >= '2025-10-01' AND completed_at < '2026-01-01'
    )
  `);
  await db.runAsync(`
    DELETE FROM workout_sessions 
    WHERE completed_at >= '2025-10-01' AND completed_at < '2026-01-01'
  `);
  // Clear personal records from sample period only
  await db.runAsync(`
    DELETE FROM personal_records 
    WHERE achieved_at >= '2025-10-01' AND achieved_at < '2026-01-01'
  `);
  console.log(
    "[Database] Deleted Oct-Dec 2025 workout data (preserved Jan 2026+)"
  );

  // Re-seed fresh sample data
  console.log("[Database] Starting to seed fresh sample data...");
  await seedWorkoutSessions(true); // Force reseed, bypass existence checks
  console.log("[Database] Seeding complete");
};

// Get workout counts per week for debugging
export const getWeeklyWorkoutCounts = async (): Promise<
  { weekStart: string; count: number }[]
> => {
  if (!db) return [];

  const rows = await db.getAllAsync<{ week_start: string; count: number }>(`
    SELECT 
      date(completed_at, 'weekday 0', '-6 days') as week_start,
      COUNT(*) as count
    FROM workout_sessions 
    WHERE completed_at IS NOT NULL
    GROUP BY week_start
    ORDER BY week_start
  `);

  return rows.map((row) => ({ weekStart: row.week_start, count: row.count }));
};
