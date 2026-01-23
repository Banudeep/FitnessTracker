import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BodyMeasurement } from "../types";
import { uploadMeasurement, syncMeasurementDeletion } from "../services/syncService";

interface MeasurementState {
  measurements: BodyMeasurement[];
  deletedIds: string[]; // Track deleted IDs for sync

  // Actions
  addMeasurement: (
    measurement: Omit<BodyMeasurement, "id" | "syncedAt">
  ) => void;
  updateMeasurement: (id: string, updates: Partial<BodyMeasurement>) => void;
  deleteMeasurement: (id: string) => void;
  deleteMeasurementFromSync: (id: string) => void;
  clearDeletedIds: () => void; // To clear after sync
  getLatestMeasurement: () => BodyMeasurement | undefined;
  getMeasurementHistory: (limit?: number) => BodyMeasurement[];
}

const generateId = () =>
  `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useMeasurementStore = create<MeasurementState>()(
  persist(
    (set, get) => ({
      measurements: [],
      deletedIds: [],

      addMeasurement: (measurement) => {
        const newMeasurement: BodyMeasurement = {
          ...measurement,
          id: generateId(),
          syncedAt: null,
        };
        set((state) => ({
          measurements: [newMeasurement, ...state.measurements],
        }));

        // Sync to cloud (fire and forget)
        uploadMeasurement(newMeasurement).catch(err => {
          console.error("[Sync] Failed to upload measurement:", err);
        });
      },

      updateMeasurement: (id, updates) => {
        set((state) => {
          const updatedMeasurements = state.measurements.map((m) =>
            m.id === id ? { ...m, ...updates, syncedAt: null } : m
          );
          
          const updatedItem = updatedMeasurements.find(m => m.id === id);
          if (updatedItem) {
             // Sync to cloud (fire and forget)
             uploadMeasurement(updatedItem).catch(err => {
               console.error("[Sync] Failed to upload updated measurement:", err);
             });
          }

          return { measurements: updatedMeasurements };
        });
      },

      deleteMeasurement: (id) => {
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
          deletedIds: [...(state.deletedIds || []), id],
        }));

        // Sync deletion to cloud (fire and forget)
        syncMeasurementDeletion(id).catch(err => {
          console.error("[Sync] Failed to sync measurement deletion:", err);
        });
      },

      deleteMeasurementFromSync: (id) => {
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
        }));
      },

      clearDeletedIds: () => {
        set({ deletedIds: [] });
      },

      getLatestMeasurement: () => {
        const { measurements } = get();
        if (measurements.length === 0) return undefined;
        return measurements.reduce((latest, current) => {
          const latestDate = new Date(latest.measuredAt);
          const currentDate = new Date(current.measuredAt);
          return currentDate > latestDate ? current : latest;
        });
      },

      getMeasurementHistory: (limit = 10) => {
        const { measurements } = get();
        return [...measurements]
          .sort(
            (a, b) =>
              new Date(b.measuredAt).getTime() -
              new Date(a.measuredAt).getTime()
          )
          .slice(0, limit);
      },
    }),
    {
      name: "fitness-measurements-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
