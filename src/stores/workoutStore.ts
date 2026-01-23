import { create } from "zustand";
import type {
  WorkoutSession,
  WorkoutTemplate,
  ExerciseLog,
  Set,
  ActiveWorkout,
} from "../types";
import {
  saveWorkoutSession,
  getActiveWorkoutSession,
  getActiveWorkoutSessionByTemplate,
  deleteSet as deleteSetFromDB,
  updateSet as updateSetInDB,
  deleteTemplate as deleteTemplateFromDB,
  updateTemplate as updateTemplateInDB,
  deleteWorkoutSession as deleteSessionFromDB,
} from "../services/database";
import { showToast } from "../components/ui";
import { useProgressStore } from "./progressStore";
import { uploadWorkoutSession, uploadWorkoutTemplate, syncTemplateDeletion, syncSessionDeletion } from "../services/syncService";
import { mediumImpact, heavyImpact } from "../services/haptics";

interface WorkoutState {
  // Active workout
  activeWorkout: ActiveWorkout | null;

  // Templates
  templates: WorkoutTemplate[];

  // History
  recentSessions: WorkoutSession[];

  // Actions
  startWorkout: (template: WorkoutTemplate) => Promise<void>;
  endWorkout: () => WorkoutSession | null;
  cancelWorkout: () => Promise<void>;

  // Exercise logging
  selectExercise: (exerciseId: string) => void;
  logSet: (exerciseLogId: string, weight: number, reps: number) => void;
  updateSet: (
    exerciseLogId: string,
    setId: string,
    weight: number,
    reps: number
  ) => void;
  deleteSet: (exerciseLogId: string, setId: string) => void;
  completeExercise: (exerciseId: string) => void;
  addExerciseToWorkout: (exerciseId: string, exerciseName: string) => void;
  reorderExerciseLogs: (exerciseLogs: import("../types").ExerciseLog[]) => void;

  // Persistence
  loadActiveWorkout: () => Promise<void>;

  // Template management
  setTemplates: (templates: WorkoutTemplate[]) => void;
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (
    templateId: string,
    template: Omit<
      WorkoutTemplate,
      "id" | "createdAt" | "updatedAt" | "exercises"
    > & {
      exercises: Omit<
        import("../types").TemplateExercise,
        "id" | "templateId"
      >[];
    }
  ) => Promise<void>;
  removeTemplate: (templateId: string) => Promise<void>;
  reorderTemplates: (templates: WorkoutTemplate[]) => void;

  // History
  setRecentSessions: (sessions: WorkoutSession[]) => void;
  removeSession: (sessionId: string) => Promise<void>;
  updateSession: (
    sessionId: string,
    updates: Partial<WorkoutSession>
  ) => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  templates: [],
  recentSessions: [], // Loaded from database in _layout.tsx

  startWorkout: async (template: WorkoutTemplate) => {
    // First, save current active workout if it exists and is different
    const currentActive = get().activeWorkout;
    if (currentActive && currentActive.session.templateId !== template.id) {
      // Save the current workout before switching
      await saveWorkoutSession(currentActive.session).catch((err) => {
        console.error("Failed to save current workout before switching:", err);
      });
    }

    console.log("[StartWorkout] Starting workout for template:", template.name, "Exercises:", template.exercises.length);

    // Check if there's already an active workout for this template
    const existingSession = await getActiveWorkoutSessionByTemplate(
      template.id
    ).catch(() => null);

    if (existingSession) {
      console.log("[StartWorkout] Found existing active session:", existingSession.id);
      // Resume existing workout
      const templateObj = get().templates.find((t) => t.id === template.id);
      if (templateObj) {
        console.log("[StartWorkout] Syncing existing session with latest template");
        
        // Sync session exercises with template exercises
        // This ensures added/removed exercises are reflected in the resumed session
        const existingLogMap = new Map(existingSession.exerciseLogs.map((l) => [l.exerciseId, l]));
        let hasChanges = false;

        const mergedLogs = templateObj.exercises.map((te, index) => {
          const existingLog = existingLogMap.get(te.exerciseId);
          if (existingLog) return existingLog;

          // New log found in template but missing in session
          console.log("[StartWorkout] Adding missing exercise to session:", te.exercise?.name);
          hasChanges = true;
          return {
            id: generateId(),
            sessionId: existingSession.id,
            exerciseId: te.exerciseId,
            exerciseName: te.exercise?.name || "Unknown",
            completedAt: null,
            sets: [],
          };
        });

        // Check if any exercises were removed (present in logs but not in template)
        if (existingSession.exerciseLogs.length !== mergedLogs.length) {
          hasChanges = true; 
        }

        if (hasChanges) {
          existingSession.exerciseLogs = mergedLogs;
          // Save the updated session structure to DB
          saveWorkoutSession(existingSession).catch(err => {
             console.error("[StartWorkout] Failed to save synced session:", err);
          });
        }

        // Calculate first and last set times from logged sets
        let firstSetTime: Date | null = null;
        let lastSetTime: Date | null = null;

        existingSession.exerciseLogs.forEach((log) => {
          log.sets.forEach((set) => {
            if (!firstSetTime || set.loggedAt < firstSetTime) {
              firstSetTime = set.loggedAt;
            }
            if (!lastSetTime || set.loggedAt > lastSetTime) {
              lastSetTime = set.loggedAt;
            }
          });
        });

        set({
          activeWorkout: {
            session: existingSession,
            template: templateObj,
            currentExerciseIndex: null,
            completedExerciseIds: existingSession.exerciseLogs
              .filter((log: ExerciseLog) => log.completedAt)
              .map((log: ExerciseLog) => log.exerciseId),
            firstSetTime,
            lastSetTime,
          },
        });
        return;
      }
    }

    // Create new workout session
    const session: WorkoutSession = {
      id: generateId(),
      userId: null,
      templateId: template.id,
      templateName: template.name,
      startedAt: new Date(),
      completedAt: null,
      durationSeconds: null,
      totalVolume: null,
      syncedAt: null,
      exerciseLogs: template.exercises.map((te, index) => ({
        id: generateId(),
        sessionId: "", // Will be set properly
        exerciseId: te.exerciseId,
        exerciseName: te.exercise?.name || "Unknown",
        completedAt: null,
        sets: [],
      })),
    };

    // Set sessionId on exercise logs
    session.exerciseLogs = session.exerciseLogs.map((log) => ({
      ...log,
      sessionId: session.id,
    }));

    // Save initial workout session to database (fire and forget)
    saveWorkoutSession(session).catch((err) => {
      console.error("Failed to save initial workout session:", err);
    });

    set({
      activeWorkout: {
        session,
        template,
        currentExerciseIndex: null,
        completedExerciseIds: [],
        firstSetTime: null,
        lastSetTime: null,
      },
    });
  },

  endWorkout: () => {
    // Haptic feedback for completing a workout
    heavyImpact();

    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    const now = new Date();
    // Calculate duration from first set to last set (or now if still logging)
    let durationSeconds = 0;
    if (activeWorkout.firstSetTime) {
      const endTime = activeWorkout.lastSetTime || now;
      durationSeconds = Math.floor(
        (endTime.getTime() - activeWorkout.firstSetTime.getTime()) / 1000
      );
    }

    // Calculate total volume
    let totalVolume = 0;
    activeWorkout.session.exerciseLogs.forEach((log) => {
      log.sets.forEach((s) => {
        totalVolume += s.weight * s.reps;
      });
    });

    const completedSession: WorkoutSession = {
      ...activeWorkout.session,
      completedAt: now,
      durationSeconds,
      totalVolume,
    };

    // Save to database (fire and forget - errors logged to console)
    saveWorkoutSession(completedSession).catch((err) => {
      console.error("Failed to save workout to database:", err);
      showToast({
        type: "error",
        title: "Save Error",
        message: "Failed to save workout. Your progress may not be saved.",
        duration: 5000,
      });
    });

    // Check for new PRs
    // We don't await this to keep UI responsive, it happens in background
    useProgressStore.getState().checkAndSavePRs(completedSession).catch(err => {
      console.error("Failed to check for PRs:", err);
    });

    // Sync to cloud (fire and forget)
    uploadWorkoutSession(completedSession).catch(err => {
      console.error("[Sync] Failed to upload workout:", err);
    });

    set((state) => ({
      activeWorkout: null,
      recentSessions: [completedSession, ...state.recentSessions].slice(0, 50),
    }));

    return completedSession;
  },

  cancelWorkout: async () => {
    const state = get();
    if (state.activeWorkout) {
      // Delete the session from the database
      await deleteSessionFromDB(state.activeWorkout.session.id).catch((err) => {
        console.error("Failed to delete cancelled workout session:", err);
      });
    }
    set({ activeWorkout: null });
  },

  selectExercise: (exerciseId: string) => {
    set((state) => {
      if (!state.activeWorkout) return state;

      const index = state.activeWorkout.session.exerciseLogs.findIndex(
        (log) => log.exerciseId === exerciseId
      );

      return {
        activeWorkout: {
          ...state.activeWorkout,
          currentExerciseIndex: index >= 0 ? index : null,
        },
      };
    });
  },

  logSet: (exerciseLogId: string, weight: number, reps: number) => {
    // Haptic feedback for logging a set
    mediumImpact();

    set((state) => {
      if (!state.activeWorkout) return state;

      const now = new Date();

      const newSet: Set = {
        id: generateId(),
        exerciseLogId,
        setNumber: 0, // Will be calculated
        weight,
        reps,
        rpe: null, // RPE tracking - optional
        isPR: false, // TODO: Check for PR
        loggedAt: now,
      };

      const updatedLogs = state.activeWorkout.session.exerciseLogs.map(
        (log) => {
          if (log.id === exerciseLogId) {
            const updatedSets = [
              ...log.sets,
              { ...newSet, setNumber: log.sets.length + 1 },
            ];
            return { ...log, sets: updatedSets };
          }
          return log;
        }
      );

      // Track first and last set times
      const firstSetTime = state.activeWorkout.firstSetTime || now;
      const lastSetTime = now;

      const updatedSession = {
        ...state.activeWorkout.session,
        exerciseLogs: updatedLogs,
      };

      // Save to database after each set (fire and forget)
      saveWorkoutSession(updatedSession).catch((err) => {
        console.error("Failed to save workout session:", err);
      });

      return {
        activeWorkout: {
          ...state.activeWorkout,
          firstSetTime,
          lastSetTime,
          session: updatedSession,
        },
      };
    });
  },

  updateSet: (
    exerciseLogId: string,
    setId: string,
    weight: number,
    reps: number
  ) => {
    set((state) => {
      if (!state.activeWorkout) return state;

      const updatedLogs = state.activeWorkout.session.exerciseLogs.map(
        (log) => {
          if (log.id === exerciseLogId) {
            const updatedSets = log.sets.map((s) =>
              s.id === setId ? { ...s, weight, reps } : s
            );
            return { ...log, sets: updatedSets };
          }
          return log;
        }
      );

      const updatedSession = {
        ...state.activeWorkout.session,
        exerciseLogs: updatedLogs,
      };

      // Update in database and save updated session (fire and forget)
      Promise.all([
        updateSetInDB(setId, weight, reps),
        saveWorkoutSession(updatedSession),
      ]).catch((err) => {
        console.error("Failed to update set or save workout session:", err);
      });

      return {
        activeWorkout: {
          ...state.activeWorkout,
          session: updatedSession,
        },
      };
    });
  },

  deleteSet: (exerciseLogId: string, setId: string) => {
    set((state) => {
      if (!state.activeWorkout) return state;

      const updatedLogs = state.activeWorkout.session.exerciseLogs.map(
        (log) => {
          if (log.id === exerciseLogId) {
            const updatedSets = log.sets
              .filter((s) => s.id !== setId)
              .map((s, index) => ({ ...s, setNumber: index + 1 })); // Re-number sets
            return { ...log, sets: updatedSets };
          }
          return log;
        }
      );

      const updatedSession = {
        ...state.activeWorkout.session,
        exerciseLogs: updatedLogs,
      };

      // Delete from database and save updated session (fire and forget)
      Promise.all([
        deleteSetFromDB(setId),
        saveWorkoutSession(updatedSession),
      ]).catch((err) => {
        console.error("Failed to delete set or save workout session:", err);
      });

      return {
        activeWorkout: {
          ...state.activeWorkout,
          session: updatedSession,
        },
      };
    });
  },

  completeExercise: (exerciseId: string) => {
    // Haptic feedback for completing an exercise
    mediumImpact();

    set((state) => {
      if (!state.activeWorkout) return state;

      const updatedLogs = state.activeWorkout.session.exerciseLogs.map(
        (log) => {
          if (log.exerciseId === exerciseId) {
            return { ...log, completedAt: new Date() };
          }
          return log;
        }
      );

      return {
        activeWorkout: {
          ...state.activeWorkout,
          session: {
            ...state.activeWorkout.session,
            exerciseLogs: updatedLogs,
          },
          completedExerciseIds: [
            ...state.activeWorkout.completedExerciseIds,
            exerciseId,
          ],
          currentExerciseIndex: null,
        },
      };
    });
  },

  addExerciseToWorkout: (exerciseId: string, exerciseName: string) => {
    set((state) => {
      if (!state.activeWorkout) return state;

      const newLog: ExerciseLog = {
        id: generateId(),
        sessionId: state.activeWorkout.session.id,
        exerciseId,
        exerciseName,
        completedAt: null,
        sets: [],
      };

      return {
        activeWorkout: {
          ...state.activeWorkout,
          session: {
            ...state.activeWorkout.session,
            exerciseLogs: [...state.activeWorkout.session.exerciseLogs, newLog],
          },
        },
      };
    });
  },

  setTemplates: (templates: WorkoutTemplate[]) => {
    set({ templates });
  },

  addTemplate: (template: WorkoutTemplate) => {
    set((state) => ({
      templates: [...state.templates, template],
    }));
    console.log("[AddTemplate] Added template:", template.name, "Exercises:", template.exercises.length);
    
    // Sync to cloud (fire and forget)
    uploadWorkoutTemplate(template).catch(err => {
      console.error("[Sync] Failed to upload template:", err);
    });
  },

  updateTemplate: async (
    templateId: string,
    template: Omit<
      WorkoutTemplate,
      "id" | "createdAt" | "updatedAt" | "exercises"
    > & {
      exercises: Omit<
        import("../types").TemplateExercise,
        "id" | "templateId"
      >[];
    }
  ) => {
    try {
      const updatedTemplate = await updateTemplateInDB(templateId, template);
      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === templateId ? updatedTemplate : t
        ),
      }));
      console.log("[UpdateTemplate] Updated template:", updatedTemplate.name, "Exercises:", updatedTemplate.exercises.length);

      // Sync to cloud (fire and forget)
      uploadWorkoutTemplate(updatedTemplate).catch(err => {
        console.error("[Sync] Failed to upload updated template:", err);
      });
    } catch (error) {
      console.error("Failed to update template:", error);
      throw error;
    }
  },

  removeTemplate: async (templateId: string) => {
    // Store previous state for rollback
    const previousTemplates = get().templates;

    // Optimistic update
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
    }));

    try {
      console.log(`[RemoveTemplate] Optimistically removing template: ${templateId}`);
      await deleteTemplateFromDB(templateId);
      
      // Sync deletion to cloud (fire and forget)
      syncTemplateDeletion(templateId).catch(err => {
        console.error("[Sync] Failed to sync template deletion:", err);
      });

      showToast({
        type: "success",
        title: "Template Deleted",
        message: "The workout template has been deleted.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to delete template:", error);
      
      // Rollback on failure
      set({ templates: previousTemplates });
      
      showToast({
        type: "error",
        title: "Delete Failed",
        message: "Failed to delete the template. Please try again.",
        duration: 5000,
      });
      throw error;
    }
  },

  reorderTemplates: (templates: WorkoutTemplate[]) => {
    set({ templates });
  },

  reorderExerciseLogs: (exerciseLogs) => {
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: {
          ...state.activeWorkout,
          session: {
            ...state.activeWorkout.session,
            exerciseLogs,
          },
        },
      };
    });
  },

  setRecentSessions: (sessions: WorkoutSession[]) => {
    set({ recentSessions: sessions });
  },

  removeSession: async (sessionId: string) => {
    // Store previous state for rollback
    const previousSessions = get().recentSessions;
    const previousActive = get().activeWorkout;

    // Optimistic update
    set((state) => {
      let activeWorkout = state.activeWorkout;
      // If the deleted session is the current active workout, clear it
      if (activeWorkout && activeWorkout.session.id === sessionId) {
        activeWorkout = null;
      }
      return {
        activeWorkout,
        recentSessions: state.recentSessions.filter((s) => s.id !== sessionId),
      };
    });

    try {
      console.log(`[RemoveSession] Optimistically removing session: ${sessionId}`);
      await deleteSessionFromDB(sessionId);
      
      // Sync deletion to cloud (fire and forget)
      syncSessionDeletion(sessionId).catch(err => {
        console.error("[Sync] Failed to sync session deletion:", err);
      });
      
      showToast({
        type: "success",
        title: "Workout Deleted",
        message: "The workout has been deleted successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to delete session:", error);
      
      // Rollback on failure
      set({ 
        recentSessions: previousSessions,
        activeWorkout: previousActive 
      });

      showToast({
        type: "error",
        title: "Delete Failed",
        message: "Failed to delete the workout. Please try again.",
        duration: 5000,
      });
      throw error;
    }
  },

  updateSession: async (
    sessionId: string,
    updates: Partial<WorkoutSession>
  ) => {
    try {
      const state = get();
      const session = state.recentSessions.find((s) => s.id === sessionId);
      if (!session) throw new Error("Session not found");

      const updatedSession = { ...session, ...updates, syncedAt: null };
      await saveWorkoutSession(updatedSession);

      // Sync to cloud (fire and forget)
      uploadWorkoutSession(updatedSession).catch(err => {
        console.error("[Sync] Failed to upload updated session:", err);
      });

      set((state) => ({
        recentSessions: state.recentSessions.map((s) =>
          s.id === sessionId ? updatedSession : s
        ),
      }));
    } catch (error) {
      console.error("Failed to update session:", error);
      showToast({
        type: "error",
        title: "Update Failed",
        message: "Failed to update the workout. Please try again.",
        duration: 5000,
      });
      throw error;
    }
  },

  loadActiveWorkout: async () => {
    try {
      const activeSession = await getActiveWorkoutSession();
      if (activeSession) {
        // Find the template that matches this session
        const template = get().templates.find(
          (t) => t.id === activeSession.templateId
        );

        if (template) {
          // Calculate first and last set times from logged sets
          let firstSetTime: Date | null = null;
          let lastSetTime: Date | null = null;

          activeSession.exerciseLogs.forEach((log) => {
            log.sets.forEach((set) => {
              if (!firstSetTime || set.loggedAt < firstSetTime) {
                firstSetTime = set.loggedAt;
              }
              if (!lastSetTime || set.loggedAt > lastSetTime) {
                lastSetTime = set.loggedAt;
              }
            });
          });

          set({
            activeWorkout: {
              session: activeSession,
              template,
              currentExerciseIndex: null,
              completedExerciseIds: activeSession.exerciseLogs
                .filter((log) => log.completedAt)
                .map((log) => log.exerciseId),
              firstSetTime,
              lastSetTime,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to load active workout:", error);
    }
  },
}));
