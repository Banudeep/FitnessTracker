/**
 * Workout Validation Schemas
 * Uses Zod for runtime validation of workout-related inputs
 */
import { z } from "zod";

// Weight constraints (reasonable gym weight range)
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 999;

// Reps constraints
const REPS_MIN = 1;
const REPS_MAX = 999;

// Body measurement constraints (in inches/lbs or cm/kg)
const MEASUREMENT_MIN = 0;
const MEASUREMENT_MAX = 999;

/**
 * Set validation schema
 * Validates weight and reps for a single set
 */
export const setSchema = z.object({
  weight: z
    .number()
    .min(WEIGHT_MIN, `Weight must be at least ${WEIGHT_MIN}`)
    .max(WEIGHT_MAX, `Weight must be at most ${WEIGHT_MAX}`),
  reps: z
    .number()
    .int("Reps must be a whole number")
    .min(REPS_MIN, `Reps must be at least ${REPS_MIN}`)
    .max(REPS_MAX, `Reps must be at most ${REPS_MAX}`),
  rpe: z
    .number()
    .min(1, "RPE must be at least 1")
    .max(10, "RPE must be at most 10")
    .optional()
    .nullable(),
});

export type SetFormData = z.infer<typeof setSchema>;

/**
 * Body measurement validation schema
 * All fields are optional since users may only measure some metrics
 */
export const measurementSchema = z.object({
  weight: z
    .number()
    .min(MEASUREMENT_MIN, `Weight must be at least ${MEASUREMENT_MIN}`)
    .max(MEASUREMENT_MAX, `Weight must be at most ${MEASUREMENT_MAX}`)
    .optional()
    .nullable(),
  chest: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  waist: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  hips: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  leftArm: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  rightArm: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  leftThigh: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  rightThigh: z
    .number()
    .min(MEASUREMENT_MIN)
    .max(MEASUREMENT_MAX)
    .optional()
    .nullable(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional().nullable(),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;

/**
 * Custom exercise validation schema
 */
export const customExerciseSchema = z.object({
  name: z
    .string()
    .min(1, "Exercise name is required")
    .max(100, "Exercise name must be 100 characters or less")
    .trim(),
  category: z.enum([
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "core",
    "full_body",
  ]),
  equipment: z.enum([
    "barbell",
    "dumbbell",
    "cable",
    "machine",
    "bodyweight",
    "other",
  ]),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .default(""),
});

export type CustomExerciseFormData = z.infer<typeof customExerciseSchema>;

/**
 * Template validation schema
 */
export const templateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be 100 characters or less")
    .trim(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1, "Exercise ID is required"),
      })
    )
    .min(1, "Template must have at least one exercise"),
});

export type TemplateFormData = z.infer<typeof templateSchema>;

/**
 * Validation helper functions
 */

/**
 * Validate a set input and return errors or null
 */
export function validateSet(
  weight: number,
  reps: number
): { weight?: string; reps?: string } | null {
  const result = setSchema.safeParse({ weight, reps });
  if (result.success) return null;

  const errors: { weight?: string; reps?: string } = {};
  result.error.errors.forEach((err) => {
    const field = err.path[0] as "weight" | "reps";
    if (!errors[field]) {
      errors[field] = err.message;
    }
  });
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Clamp a value to valid weight range
 */
export function clampWeight(value: number): number {
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, value));
}

/**
 * Clamp a value to valid reps range
 */
export function clampReps(value: number): number {
  return Math.max(REPS_MIN, Math.min(REPS_MAX, Math.round(value)));
}

/**
 * Clamp a value to valid measurement range
 */
export function clampMeasurement(value: number): number {
  return Math.max(MEASUREMENT_MIN, Math.min(MEASUREMENT_MAX, value));
}
