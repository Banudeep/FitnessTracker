// FitTrack Type Definitions

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  preferredUnit: "lbs" | "kg";
  weeklyGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: EquipmentType;
  description: string;
  imageUrl: string | null;
  isCustom: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date | null;
  deleted?: boolean;
  deletedAt?: Date | null;
}

export type ExerciseCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "full_body";

export type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "other";

export interface WorkoutTemplate {
  id: string;
  userId: string | null;
  name: string;
  isPreset: boolean;
  exercises: TemplateExercise[];
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date | null;
  deleted?: boolean;
  deletedAt?: Date | null;
}

export interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  exercise?: Exercise;
  displayOrder: number;
}

export interface WorkoutSession {
  id: string;
  userId: string | null;
  templateId: string | null;
  templateName: string;
  startedAt: Date;
  completedAt: Date | null;
  durationSeconds: number | null;
  totalVolume: number | null;
  syncedAt: Date | null;
  exerciseLogs: ExerciseLog[];
  deleted?: boolean;
  deletedAt?: Date | null;
}

export interface ExerciseLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  completedAt: Date | null;
  sets: Set[];
}

export interface Set {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null; // Rate of Perceived Exertion (1-10)
  isPR: boolean;
  loggedAt: Date;
}

export interface PersonalRecord {
  id: string;
  userId: string | null;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: Date;
  sessionId: string | null;
  syncedAt?: Date | null;
  deleted?: boolean;
  deletedAt?: Date | null;
}

export interface BodyMeasurement {
  id: string;
  userId: string | null;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  leftArm: number | null;
  rightArm: number | null;
  leftThigh: number | null;
  rightThigh: number | null;
  notes: string | null;
  measuredAt: Date;
  syncedAt: Date | null;
  deleted?: boolean;
  deletedAt?: Date | null;
}

export interface StreakHistory {
  id: string;
  userId: string | null;
  weekStart: Date;
  workoutsCompleted: number;
  goalMet: boolean;
}

// Active workout state
export interface ActiveWorkout {
  session: WorkoutSession;
  template: WorkoutTemplate;
  currentExerciseIndex: number | null;
  completedExerciseIds: string[];
  firstSetTime: Date | null; // When first rep was logged
  lastSetTime: Date | null; // When last rep was logged
}

// Pre-fill data for exercise logging
export interface ExercisePrefill {
  exerciseId: string;
  sets: { weight: number; reps: number }[];
}
