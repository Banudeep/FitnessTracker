/**
 * Template Queries Module
 * CRUD operations for workout templates
 */
import type { WorkoutTemplate, TemplateExercise, Exercise } from "../../types";
import {
  isWeb,
  db,
  webTemplates,
  setWebTemplates,
  generateId,
  ensureDatabaseReady,
} from "./core";

  export const getAllTemplates = async (): Promise<WorkoutTemplate[]> => {
    if (isWeb) return webTemplates.filter((t) => !t.deleted);
    if (!db) return [];
  
    const templates = await db.getAllAsync<{
      id: string;
      user_id: string | null;
      name: string;
      is_preset: number;
      created_at: string;
      updated_at: string;
      synced_at: string | null;
      deleted: number | null;
      deleted_at: string | null;
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
        syncedAt: template.synced_at ? new Date(template.synced_at) : null,
        deleted: template.deleted === 1,
        deletedAt: template.deleted_at ? new Date(template.deleted_at) : null,
      });
    }
  
    return result;
  };
  
  export const saveTemplate = async (
    template: Omit<WorkoutTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<WorkoutTemplate> => {
    const id = template.id || generateId();
    const now = new Date();
  
    const newTemplate: WorkoutTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
      exercises: template.exercises.map((e, index) => ({
        id: e.id || generateId(),
        templateId: id,
        exerciseId: e.exerciseId,
        displayOrder: index,
        exercise: e.exercise,
      })),
    };
  
    if (isWeb) {
      const updated = [...webTemplates, newTemplate];
      setWebTemplates(updated);
      return newTemplate;
    }
  
    if (!db) {
    await ensureDatabaseReady();
    if (!db) throw new Error("Database not initialized");
  }
  
    const nowStr = now.toISOString();
  
    await db.runAsync(
      `INSERT INTO workout_templates (id, user_id, name, is_preset, created_at, updated_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
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

  export const saveSyncedTemplate = async (
    template: WorkoutTemplate
  ): Promise<WorkoutTemplate> => {
    if (isWeb) {
      // For web, just push or update
      const index = webTemplates.findIndex(t => t.id === template.id);
      if (index >= 0) {
        webTemplates[index] = template;
      } else {
        webTemplates.push(template);
      }
      return template;
    }

    if (!db) {
      await ensureDatabaseReady();
      if (!db) throw new Error("Database not initialized");
    }

    const nowStr = new Date().toISOString();
    const createdAtStr = template.createdAt instanceof Date ? template.createdAt.toISOString() : nowStr;
    const updatedAtStr = template.updatedAt instanceof Date ? template.updatedAt.toISOString() : nowStr;
    const syncedAtStr = template.syncedAt instanceof Date ? template.syncedAt.toISOString() : (template.syncedAt || null);

    try {
      // Upsert template
      await db.runAsync(
        `INSERT OR REPLACE INTO workout_templates (id, user_id, name, is_preset, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          template.id,
          template.userId,
          template.name,
          template.isPreset ? 1 : 0,
          createdAtStr,
          updatedAtStr,
          syncedAtStr
        ]
      );

      // Replace exercises safely
      await db.runAsync("DELETE FROM template_exercises WHERE template_id = ?", [template.id]);

      for (const exercise of template.exercises) {
        await db.runAsync(
          `INSERT INTO template_exercises (id, template_id, exercise_id, display_order)
           VALUES (?, ?, ?, ?)`,
          [exercise.id, template.id, exercise.exerciseId, exercise.displayOrder]
        );
      }

      return template;
    } catch (error) {
      console.error("[Database] Error saving synced template:", error);
      throw error;
    }
  };
  
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
          exercises: template.exercises.map((e, idx) => ({
            id: generateId(),
            templateId,
            exerciseId: e.exerciseId,
            displayOrder: idx,
            exercise: e.exercise,
          })),
        };
        const newList = [...webTemplates];
        newList[index] = updatedTemplate;
        setWebTemplates(newList);
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
         SET name = ?, is_preset = ?, updated_at = ?, synced_at = NULL
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
          const exerciseRow = await db!.getFirstAsync<{
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
              category: exerciseRow.category as Exercise["category"],
              equipment: exerciseRow.equipment as Exercise["equipment"],
              description: exerciseRow.description,
              imageUrl: exerciseRow.image_url,
              isCustom: exerciseRow.is_custom === 1,
              userId: exerciseRow.user_id,
              createdAt: new Date(exerciseRow.created_at),
              updatedAt: new Date(exerciseRow.updated_at),
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
  
  export const deleteTemplate = async (templateId: string): Promise<void> => {
    if (isWeb) {
      const template = webTemplates.find((t) => t.id === templateId);
      if (template) {
        template.deleted = true;
        template.deletedAt = new Date();
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
          `UPDATE workout_templates SET deleted = 1, deleted_at = ? WHERE id = ?`,
          [now, templateId]
      );
      // We do NOT delete from template_exercises yet, because we might undelete?
      // Actually strictly speaking we should probably not fetch them if template is deleted.
    } catch (error) {
      console.error("[Database] Error deleting template:", error);
      throw error;
    }
  };

  export const getDeletedTemplates = async (): Promise<WorkoutTemplate[]> => {
    if (isWeb) {
      return webTemplates.filter((t) => t.deleted);
    }
    if (!db) return [];
  
    const templates = await db.getAllAsync<{
      id: string;
      user_id: string | null;
      deleted_at: string;
    }>(
      `SELECT id, user_id, deleted_at FROM workout_templates 
       WHERE deleted = 1`
    );
  
    return templates.map((t) => ({
      id: t.id,
      userId: t.user_id,
      name: "",
      isPreset: false,
      exercises: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: true,
      deletedAt: new Date(t.deleted_at),
    }));
  };
  
  export const hardDeleteLocalTemplate = async (templateId: string): Promise<void> => {
    if (isWeb) {
      const updated = webTemplates.filter((t) => t.id !== templateId);
      setWebTemplates(updated);
      return;
    }
    if (!db) return;
  
    try {
      await db.runAsync("DELETE FROM template_exercises WHERE template_id = ?", [
        templateId,
      ]);
      await db.runAsync("DELETE FROM workout_templates WHERE id = ?", [
        templateId,
      ]);
    } catch (error) {
      console.error("[Database] Error hard-deleting template:", error);
    }
  };

  export const getUnsyncedTemplates = async (): Promise<WorkoutTemplate[]> => {
    if (isWeb) return [];
    if (!db) return [];
  
    const templates = await db.getAllAsync<{
      id: string;
      user_id: string | null;
      name: string;
      is_preset: number;
      created_at: string;
      updated_at: string;
      synced_at: string | null;
    }>(
      `SELECT * FROM workout_templates 
       WHERE (synced_at IS NULL) 
       AND (deleted IS NULL OR deleted = 0)
       AND (is_preset = 0)`
    );
  
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
        syncedAt: template.synced_at ? new Date(template.synced_at) : null,
        deleted: false,
      });
    }
    return result;
  };
  
  export const markTemplateSynced = async (templateId: string): Promise<void> => {
    if (isWeb) return;
    const isReady = await ensureDatabaseReady();
    if (!isReady || !db) return;
  
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE workout_templates SET synced_at = ? WHERE id = ?",
      [now, templateId]
    );
  };
