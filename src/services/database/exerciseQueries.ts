/**
 * Exercise Queries Module
 * CRUD operations for exercises
 */
import type { Exercise } from "../../types";
import {
  isWeb,
  db,
  webExercises,
  setWebExercises,
  generateId,
  ensureDatabaseReady,
} from "./core";

export const getAllExercises = async (includeDeleted = false): Promise<Exercise[]> => {
  if (isWeb) return includeDeleted ? webExercises : webExercises.filter(e => !e.deleted);
  if (!db) return [];

  const query = includeDeleted 
    ? "SELECT * FROM exercises ORDER BY is_custom DESC, name"
    : "SELECT * FROM exercises WHERE (deleted IS NULL OR deleted = 0) ORDER BY is_custom DESC, name";

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
    synced_at: string | null;
    deleted: number;
    deleted_at: string | null;
  }>(query);

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

export const saveCustomExercise = async (
  exercise: Exercise
): Promise<Exercise> => {
  if (isWeb) {
    // Reuse createExercise or updateExercise logic for web
    // Simplified for native focus
    return createExercise(exercise);
  }

  if (!db) {
    await ensureDatabaseReady();
    if (!db) throw new Error("Database not initialized");
  }

  const now = new Date();
  const nowStr = now.toISOString();

  // 1. Check if ID exists (Upsert scenario)
  const existingId = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM exercises WHERE id = ?",
    [exercise.id]
  );

  if (existingId) {
    // Exercise with this ID exists. Update it.
    // Check for name conflict (different ID)
    const conflict = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) AND id != ?",
      [exercise.name.trim(), exercise.id]
    );
    
    if (conflict) {
      throw new Error(`An exercise with the name "${exercise.name.trim()}" already exists.`);
    }

    await db.runAsync(
      `UPDATE exercises 
       SET name = ?, category = ?, equipment = ?, description = ?, image_url = ?, is_custom = ?, user_id = ?, updated_at = ?, deleted = ?, deleted_at = ?, synced_at = ?
       WHERE id = ?`,
      [
        exercise.name.trim(),
        exercise.category,
        exercise.equipment,
        exercise.description,
        exercise.imageUrl,
        1, // Enforce is_custom
        exercise.userId,
        exercise.updatedAt ? exercise.updatedAt.toISOString() : nowStr,
        exercise.deleted ? 1 : 0,
        exercise.deletedAt ? exercise.deletedAt.toISOString() : null,
        exercise.syncedAt ? exercise.syncedAt.toISOString() : null,
        exercise.id,
      ]
    );
    return exercise;
  }

  // 2. New ID. Check for name conflict.
  const conflict = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM exercises WHERE LOWER(name) = LOWER(?)",
    [exercise.name.trim()]
  );

  if (conflict) {
    throw new Error(`An exercise with the name "${exercise.name.trim()}" already exists.`);
  }

  // 3. Insert
  await db.runAsync(
    `INSERT INTO exercises (id, name, category, equipment, description, image_url, is_custom, user_id, created_at, updated_at, synced_at, deleted, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exercise.id,
      exercise.name.trim(),
      exercise.category,
      exercise.equipment,
      exercise.description,
      exercise.imageUrl,
      1,
      exercise.userId,
      exercise.createdAt.toISOString(),
      exercise.updatedAt ? exercise.updatedAt.toISOString() : nowStr,
      exercise.syncedAt ? exercise.syncedAt.toISOString() : null,
      exercise.deleted ? 1 : 0,
      exercise.deletedAt ? exercise.deletedAt.toISOString() : null,
    ]
  );

  return exercise;
};

export const createExercise = async (
  exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Exercise> => {
  const id = exercise.id || generateId();
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
    const updated = [...webExercises, newExercise];
    setWebExercises(updated);
    return newExercise;
  }

  if (!db) {
    await ensureDatabaseReady();
    if (!db) throw new Error("Database not initialized");
  }

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

export const deleteExercise = async (exerciseId: string): Promise<void> => {
  if (isWeb) {
    const index = webExercises.findIndex((e) => e.id === exerciseId);
    if (index >= 0) {
      const exercise = webExercises[index];
      // Only allow deletion of custom exercises
      if (exercise.isCustom) {
        const updated = webExercises.filter((e) => e.id !== exerciseId);
        setWebExercises(updated);
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

    const nowStr = new Date().toISOString();
    
    // Soft delete
    await db.runAsync(
      "UPDATE exercises SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?", 
      [nowStr, nowStr, exerciseId]
    );
  } catch (error) {
    console.error("[Database] Error deleting exercise:", error);
    throw error;
  }
};

export const getCustomExercisesForSync = async (): Promise<Exercise[]> => {
  if (isWeb) return []; // Web sync mock
  if (!db) return [];

  const rows = await db.getAllAsync<any>(
    "SELECT * FROM exercises WHERE is_custom = 1 AND synced_at IS NULL AND (deleted IS NULL OR deleted = 0)"
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as Exercise["category"],
    equipment: row.equipment as Exercise["equipment"],
    description: row.description,
    imageUrl: row.image_url,
    isCustom: true,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    syncedAt: row.synced_at ? new Date(row.synced_at) : null,
  }));
};

export const getDeletedExercises = async (): Promise<Exercise[]> => {
  if (isWeb) return [];
  if (!db) return [];

  const rows = await db.getAllAsync<any>(
    "SELECT * FROM exercises WHERE is_custom = 1 AND deleted = 1"
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as Exercise["category"],
    equipment: row.equipment as Exercise["equipment"],
    description: row.description,
    imageUrl: row.image_url,
    isCustom: true,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deleted: true,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  }));
};

export const hardDeleteLocalExercise = async (exerciseId: string): Promise<void> => {
  if (isWeb) return;
  if (!db) return;
  await db.runAsync("DELETE FROM exercises WHERE id = ?", [exerciseId]);
};

export const markExerciseSynced = async (exerciseId: string): Promise<void> => {
  if (isWeb) return;
  if (!db) {
    await ensureDatabaseReady();
    if (!db) return;
  }
  await db.runAsync(
    "UPDATE exercises SET synced_at = ? WHERE id = ?",
    [new Date().toISOString(), exerciseId]
  );
};

export const reviveExercise = async (exerciseId: string): Promise<void> => {
  if (isWeb) return;
  if (!db) {
    await ensureDatabaseReady();
    if (!db) return;
  }
  // Reset deleted flag and clear deleted_at
  await db.runAsync(
    "UPDATE exercises SET deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?",
    [new Date().toISOString(), exerciseId]
  );
};

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
    const newList = [...webExercises];
    newList[index] = updated;
    setWebExercises(newList);
    return updated;
  }

  if (!db) {
    await ensureDatabaseReady();
    if (!db) throw new Error("Database not initialized");
  }

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

  const updatedRow = await db.getFirstAsync<{
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

  if (!updatedRow) {
    throw new Error("Exercise not found after update");
  }

  return {
    id: updatedRow.id,
    name: updatedRow.name,
    category: updatedRow.category as Exercise["category"],
    equipment: updatedRow.equipment as Exercise["equipment"],
    description: updatedRow.description,
    imageUrl: updatedRow.image_url,
    isCustom: updatedRow.is_custom === 1,
    userId: updatedRow.user_id,
    createdAt: new Date(updatedRow.created_at),
    updatedAt: new Date(updatedRow.updated_at),
  };
};
