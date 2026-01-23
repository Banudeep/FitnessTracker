/**
 * Workout Validation Schema Tests
 */
import {
  setSchema,
  measurementSchema,
  customExerciseSchema,
  templateSchema,
  validateSet,
  clampWeight,
  clampReps,
  clampMeasurement,
} from "../workoutSchemas";

describe("setSchema", () => {
  it("should validate valid set data", () => {
    const result = setSchema.safeParse({ weight: 135, reps: 10 });
    expect(result.success).toBe(true);
  });

  it("should validate set with zero weight (bodyweight exercises)", () => {
    const result = setSchema.safeParse({ weight: 0, reps: 15 });
    expect(result.success).toBe(true);
  });

  it("should validate set with optional RPE", () => {
    const result = setSchema.safeParse({ weight: 100, reps: 8, rpe: 8 });
    expect(result.success).toBe(true);
  });

  it("should reject negative weight", () => {
    const result = setSchema.safeParse({ weight: -10, reps: 10 });
    expect(result.success).toBe(false);
  });

  it("should reject weight over max", () => {
    const result = setSchema.safeParse({ weight: 1000, reps: 10 });
    expect(result.success).toBe(false);
  });

  it("should reject zero reps", () => {
    const result = setSchema.safeParse({ weight: 100, reps: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject reps over max", () => {
    const result = setSchema.safeParse({ weight: 100, reps: 1000 });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer reps", () => {
    const result = setSchema.safeParse({ weight: 100, reps: 10.5 });
    expect(result.success).toBe(false);
  });

  it("should reject RPE below 1", () => {
    const result = setSchema.safeParse({ weight: 100, reps: 10, rpe: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject RPE above 10", () => {
    const result = setSchema.safeParse({ weight: 100, reps: 10, rpe: 11 });
    expect(result.success).toBe(false);
  });
});

describe("measurementSchema", () => {
  it("should validate empty measurement (all fields optional)", () => {
    const result = measurementSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate partial measurement", () => {
    const result = measurementSchema.safeParse({
      weight: 180,
      waist: 32,
    });
    expect(result.success).toBe(true);
  });

  it("should validate full measurement", () => {
    const result = measurementSchema.safeParse({
      weight: 180,
      chest: 40,
      waist: 32,
      hips: 38,
      leftArm: 15,
      rightArm: 15,
      leftThigh: 24,
      rightThigh: 24,
      notes: "Morning measurement",
    });
    expect(result.success).toBe(true);
  });

  it("should reject negative measurement", () => {
    const result = measurementSchema.safeParse({ weight: -10 });
    expect(result.success).toBe(false);
  });

  it("should reject notes over 500 characters", () => {
    const longNotes = "a".repeat(501);
    const result = measurementSchema.safeParse({ notes: longNotes });
    expect(result.success).toBe(false);
  });
});

describe("customExerciseSchema", () => {
  it("should validate valid exercise", () => {
    const result = customExerciseSchema.safeParse({
      name: "Bulgarian Split Squat",
      category: "quads",
      equipment: "dumbbell",
    });
    expect(result.success).toBe(true);
  });

  it("should validate exercise with description", () => {
    const result = customExerciseSchema.safeParse({
      name: "Custom Press",
      category: "chest",
      equipment: "barbell",
      description: "A custom pressing movement",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = customExerciseSchema.safeParse({
      name: "",
      category: "chest",
      equipment: "barbell",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid category", () => {
    const result = customExerciseSchema.safeParse({
      name: "Test Exercise",
      category: "invalid",
      equipment: "barbell",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid equipment", () => {
    const result = customExerciseSchema.safeParse({
      name: "Test Exercise",
      category: "chest",
      equipment: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("templateSchema", () => {
  it("should validate valid template", () => {
    const result = templateSchema.safeParse({
      name: "Push Day",
      exercises: [{ exerciseId: "ex1" }, { exerciseId: "ex2" }],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = templateSchema.safeParse({
      name: "",
      exercises: [{ exerciseId: "ex1" }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty exercises array", () => {
    const result = templateSchema.safeParse({
      name: "Empty Template",
      exercises: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateSet helper", () => {
  it("should return null for valid set", () => {
    expect(validateSet(100, 10)).toBeNull();
  });

  it("should return weight error for invalid weight", () => {
    const errors = validateSet(-10, 10);
    expect(errors?.weight).toBeDefined();
    expect(errors?.reps).toBeUndefined();
  });

  it("should return reps error for invalid reps", () => {
    const errors = validateSet(100, 0);
    expect(errors?.reps).toBeDefined();
    expect(errors?.weight).toBeUndefined();
  });

  it("should return both errors for invalid weight and reps", () => {
    const errors = validateSet(-10, 0);
    expect(errors?.weight).toBeDefined();
    expect(errors?.reps).toBeDefined();
  });
});

describe("clamp helpers", () => {
  describe("clampWeight", () => {
    it("should clamp negative values to 0", () => {
      expect(clampWeight(-10)).toBe(0);
    });

    it("should clamp values over max to 999", () => {
      expect(clampWeight(1500)).toBe(999);
    });

    it("should return valid values unchanged", () => {
      expect(clampWeight(135)).toBe(135);
    });
  });

  describe("clampReps", () => {
    it("should clamp zero to 1", () => {
      expect(clampReps(0)).toBe(1);
    });

    it("should clamp values over max to 999", () => {
      expect(clampReps(1500)).toBe(999);
    });

    it("should round decimals", () => {
      expect(clampReps(10.7)).toBe(11);
    });
  });

  describe("clampMeasurement", () => {
    it("should clamp negative values to 0", () => {
      expect(clampMeasurement(-5)).toBe(0);
    });

    it("should clamp values over max to 999", () => {
      expect(clampMeasurement(1200)).toBe(999);
    });

    it("should return valid values unchanged", () => {
      expect(clampMeasurement(32.5)).toBe(32.5);
    });
  });
});
