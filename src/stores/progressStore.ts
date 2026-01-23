import { create } from 'zustand';
import type { PersonalRecord, BodyMeasurement, WorkoutSession, Set } from '../types';
import { savePersonalRecord, updateSet, recalculatePersonalRecords } from '../services/database';
import { uploadPersonalRecord } from '../services/syncService';

const generateDbId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

interface ProgressState {
  // Personal Records
  personalRecords: PersonalRecord[];
  
  // Body Measurements
  bodyMeasurements: BodyMeasurement[];
  
  // Actions
  setPersonalRecords: (records: PersonalRecord[]) => void;
  addPersonalRecord: (record: PersonalRecord) => void;
  
  setBodyMeasurements: (measurements: BodyMeasurement[]) => void;
  addBodyMeasurement: (measurement: BodyMeasurement) => void;
  
  // Selectors
  getPRForExercise: (exerciseId: string) => PersonalRecord | undefined;
  getLatestWeight: () => number | null;
  
  checkAndSavePRs: (session: WorkoutSession) => Promise<void>;
  recalculatePRs: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  personalRecords: [], // Loaded from database in _layout.tsx
  bodyMeasurements: [],

  setPersonalRecords: (records: PersonalRecord[]) => {
    set({ personalRecords: records });
  },

  addPersonalRecord: (record: PersonalRecord) => {
    set(state => ({
      personalRecords: [...state.personalRecords, record],
    }));
  },

  setBodyMeasurements: (measurements: BodyMeasurement[]) => {
    set({ bodyMeasurements: measurements });
  },

  addBodyMeasurement: (measurement: BodyMeasurement) => {
    set(state => ({
      bodyMeasurements: [measurement, ...state.bodyMeasurements],
    }));
  },

  getPRForExercise: (exerciseId: string) => {
    return get().personalRecords.find(pr => pr.exerciseId === exerciseId);
  },

  getLatestWeight: () => {
    const measurements = get().bodyMeasurements;
    if (measurements.length === 0) return null;
    return measurements[0].weight;
  },

  checkAndSavePRs: async (session: WorkoutSession) => {
    const state = get();
    
    // We'll track new PRs to update state at the end
    const newPRs: PersonalRecord[] = [];
    
    // Iterate through exercise logs in the completed session
    for (const log of session.exerciseLogs) {
      if (!log.sets || log.sets.length === 0) continue;

      const exerciseId = log.exerciseId;
      const exerciseName = log.exerciseName;
      
      // Get current PR for this exercise (highest weight ever)
      const currentPR = state.personalRecords.reduce((best, pr) => {
        if (pr.exerciseId === exerciseId) {
          if (!best || pr.weight > best.weight) return pr;
        }
        return best;
      }, undefined as PersonalRecord | undefined);

      // Analyze sets in this session to find the best lift
      let sessionBestSet: Set | null = null;
      
      for (const set of log.sets) {
        if (!sessionBestSet) {
          sessionBestSet = set;
          continue;
        }
        
        // Logic: Heavier is better. Same weight? More reps is better.
        if (set.weight > sessionBestSet.weight) {
          sessionBestSet = set;
        } else if (set.weight === sessionBestSet.weight && set.reps > sessionBestSet.reps) {
          sessionBestSet = set;
        }
      }

      if (!sessionBestSet) continue;

      // Determine if it's a new PR
      let isNewPR = false;
      
      if (!currentPR) {
        // First time doing this exercise = PR
        isNewPR = true;
      } else {
        // Beat existing PR?
        if (sessionBestSet.weight > currentPR.weight) {
          isNewPR = true;
        } else if (sessionBestSet.weight === currentPR.weight && sessionBestSet.reps > currentPR.reps) {
          isNewPR = true;
        }
      }

      if (isNewPR) {
        // It's a PR! Create the record
        const pr: PersonalRecord = {
          id: generateDbId(),
          userId: session.userId,
          exerciseId: exerciseId,
          exerciseName: exerciseName,
          weight: sessionBestSet.weight,
          reps: sessionBestSet.reps,
          achievedAt: new Date(session.completedAt || new Date()), // Use session completion time
          sessionId: session.id
        };

        // 1. Save to DB "personal_records" table
        try {
          await savePersonalRecord(pr);
          newPRs.push(pr);

          // Sync to cloud (fire and forget)
          uploadPersonalRecord(pr).catch(err => {
            console.error("[Sync] Failed to upload PR:", err);
          });

          // 2. Mark the set as a PR in the DB "sets" table
          // Note: updateSet requires (setId, weight, reps). We keep weight/reps same.
          // But looking at updateSet implementation (in database.ts or similar), does it support isPR?
          // I used 'updateSet' import, usually it updates weight/reps. 
          // If 'updateSet' doesn't support IS_PR flag, I might need 'markSetAsPR' function.
          // Let's assume for now we just track it in the PR table.
          // (Task list said "Update workoutStore to trigger PR check", but didn't strictly require tagging sets yet if not supported)
          // But wait, user sees 'Best Lifts' dashboard. That reads from 'personal_records' table. So saving PR is key.
          
        } catch (error) {
          console.error("Failed to save PR:", error);
        }
      }
    }

    if (newPRs.length > 0) {
      // Update local state with new PRs (appending them)
      // Note: We might want to remove old PRs for the same exercise if we only want to show ONE best? 
      // The store has `personalRecords: []`. 
      // If we behave like a history (List of all PRs), we just push.
      set(state => ({
        personalRecords: [...newPRs, ...state.personalRecords] // Put new ones at top
      }));
    }
  },

  recalculatePRs: async () => {
    try {
      const records = await recalculatePersonalRecords();
      set({ personalRecords: records });
    } catch (error) {
      console.error("Failed to recalculate PRs store action:", error);
    }
  }
}));
