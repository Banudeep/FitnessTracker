import { create } from 'zustand';
import type { Exercise, ExerciseCategory } from '../types';

interface ExerciseState {
  exercises: Exercise[];
  isLoaded: boolean;
  
  // Actions
  setExercises: (exercises: Exercise[]) => void;
  addExercise: (exercise: Exercise) => void;
  
  // Selectors
  getExerciseById: (id: string) => Exercise | undefined;
  getExercisesByCategory: (category: ExerciseCategory) => Exercise[];
  searchExercises: (query: string) => Exercise[];
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  isLoaded: false,

  setExercises: (exercises: Exercise[]) => {
    set({ exercises, isLoaded: true });
  },

  addExercise: (exercise: Exercise) => {
    set(state => ({
      exercises: [...state.exercises, exercise],
    }));
  },

  getExerciseById: (id: string) => {
    return get().exercises.find(e => e.id === id);
  },

  getExercisesByCategory: (category: ExerciseCategory) => {
    return get().exercises.filter(e => e.category === category);
  },

  searchExercises: (query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return get().exercises;

    return get().exercises
      .filter(e => 
        e.name.toLowerCase().includes(normalizedQuery) ||
        e.category.toLowerCase().includes(normalizedQuery) ||
        e.equipment.toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => {
        // Prioritize matches at start of name
        const aStartsWith = a.name.toLowerCase().startsWith(normalizedQuery);
        const bStartsWith = b.name.toLowerCase().startsWith(normalizedQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;
        return a.name.localeCompare(b.name);
      });
  },
}));
