// Built-in Exercise Database
import type { Exercise, ExerciseCategory, EquipmentType } from '../types';

type ExerciseData = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'userId'>;

// Helper to create exercise entries
const createExercise = (
  name: string,
  category: ExerciseCategory,
  equipment: EquipmentType,
  description: string
): ExerciseData => ({
  name,
  category,
  equipment,
  description,
  imageUrl: null,
});

export const builtInExercises: ExerciseData[] = [
  // CHEST
  createExercise('Barbell Bench Press', 'chest', 'barbell', 'Flat bench press with barbell'),
  createExercise('Incline Barbell Bench Press', 'chest', 'barbell', 'Incline bench press with barbell'),
  createExercise('Decline Barbell Bench Press', 'chest', 'barbell', 'Decline bench press with barbell'),
  createExercise('Dumbbell Bench Press', 'chest', 'dumbbell', 'Flat bench press with dumbbells'),
  createExercise('Incline Dumbbell Press', 'chest', 'dumbbell', 'Incline press with dumbbells'),
  createExercise('Dumbbell Fly', 'chest', 'dumbbell', 'Flat bench dumbbell fly'),
  createExercise('Incline Dumbbell Fly', 'chest', 'dumbbell', 'Incline dumbbell fly'),
  createExercise('Cable Fly', 'chest', 'cable', 'Cable crossover fly'),
  createExercise('Cable Crossover', 'chest', 'cable', 'High to low cable crossover'),
  createExercise('Chest Press Machine', 'chest', 'machine', 'Seated chest press machine'),
  createExercise('Pec Deck', 'chest', 'machine', 'Pec deck fly machine'),
  createExercise('Push-ups', 'chest', 'bodyweight', 'Standard push-ups'),
  createExercise('Dips (Chest)', 'chest', 'bodyweight', 'Chest-focused dips, leaning forward'),

  // BACK
  createExercise('Deadlift', 'back', 'barbell', 'Conventional deadlift'),
  createExercise('Sumo Deadlift', 'back', 'barbell', 'Wide stance sumo deadlift'),
  createExercise('Barbell Row', 'back', 'barbell', 'Bent over barbell row'),
  createExercise('Pendlay Row', 'back', 'barbell', 'Strict barbell row from floor'),
  createExercise('T-Bar Row', 'back', 'barbell', 'T-bar row'),
  createExercise('Dumbbell Row', 'back', 'dumbbell', 'Single arm dumbbell row'),
  createExercise('Lat Pulldown', 'back', 'cable', 'Wide grip lat pulldown'),
  createExercise('Close Grip Lat Pulldown', 'back', 'cable', 'Close grip lat pulldown'),
  createExercise('Seated Cable Row', 'back', 'cable', 'Seated cable row'),
  createExercise('Face Pull', 'back', 'cable', 'Cable face pull for rear delts'),
  createExercise('Pull-ups', 'back', 'bodyweight', 'Standard pull-ups'),
  createExercise('Chin-ups', 'back', 'bodyweight', 'Underhand grip chin-ups'),
  createExercise('Cable Pullover', 'back', 'cable', 'Standing cable pullover'),
  createExercise('Machine Row', 'back', 'machine', 'Seated machine row'),

  // SHOULDERS
  createExercise('Overhead Press', 'shoulders', 'barbell', 'Standing barbell overhead press'),
  createExercise('Seated Overhead Press', 'shoulders', 'barbell', 'Seated barbell overhead press'),
  createExercise('Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'Seated dumbbell shoulder press'),
  createExercise('Arnold Press', 'shoulders', 'dumbbell', 'Arnold dumbbell press'),
  createExercise('Lateral Raise', 'shoulders', 'dumbbell', 'Dumbbell lateral raises'),
  createExercise('Front Raise', 'shoulders', 'dumbbell', 'Dumbbell front raises'),
  createExercise('Rear Delt Fly', 'shoulders', 'dumbbell', 'Bent over rear delt fly'),
  createExercise('Cable Lateral Raise', 'shoulders', 'cable', 'Single arm cable lateral raise'),
  createExercise('Machine Shoulder Press', 'shoulders', 'machine', 'Seated shoulder press machine'),
  createExercise('Reverse Pec Deck', 'shoulders', 'machine', 'Reverse pec deck for rear delts'),
  createExercise('Upright Row', 'shoulders', 'barbell', 'Barbell upright row'),
  createExercise('Shrugs', 'shoulders', 'dumbbell', 'Dumbbell shrugs'),
  createExercise('Barbell Shrugs', 'shoulders', 'barbell', 'Barbell shrugs'),

  // BICEPS
  createExercise('Barbell Curl', 'biceps', 'barbell', 'Standing barbell curl'),
  createExercise('EZ Bar Curl', 'biceps', 'barbell', 'EZ bar curl'),
  createExercise('Dumbbell Curl', 'biceps', 'dumbbell', 'Standing dumbbell curl'),
  createExercise('Hammer Curl', 'biceps', 'dumbbell', 'Dumbbell hammer curl'),
  createExercise('Incline Dumbbell Curl', 'biceps', 'dumbbell', 'Incline bench dumbbell curl'),
  createExercise('Concentration Curl', 'biceps', 'dumbbell', 'Seated concentration curl'),
  createExercise('Preacher Curl', 'biceps', 'barbell', 'Preacher curl with EZ bar'),
  createExercise('Cable Curl', 'biceps', 'cable', 'Standing cable curl'),
  createExercise('Machine Preacher Curl', 'biceps', 'machine', 'Machine preacher curl'),
  createExercise('Spider Curl', 'biceps', 'dumbbell', 'Spider curl on incline bench'),

  // TRICEPS
  createExercise('Close Grip Bench Press', 'triceps', 'barbell', 'Close grip barbell bench press'),
  createExercise('Skull Crushers', 'triceps', 'barbell', 'Lying tricep extension with EZ bar'),
  createExercise('Tricep Pushdown', 'triceps', 'cable', 'Cable tricep pushdown'),
  createExercise('Rope Pushdown', 'triceps', 'cable', 'Rope tricep pushdown'),
  createExercise('Overhead Tricep Extension', 'triceps', 'dumbbell', 'Seated overhead dumbbell extension'),
  createExercise('Cable Overhead Extension', 'triceps', 'cable', 'Cable overhead tricep extension'),
  createExercise('Tricep Kickback', 'triceps', 'dumbbell', 'Dumbbell tricep kickback'),
  createExercise('Dips (Triceps)', 'triceps', 'bodyweight', 'Tricep-focused dips, upright'),
  createExercise('Diamond Push-ups', 'triceps', 'bodyweight', 'Diamond grip push-ups'),
  createExercise('Tricep Machine', 'triceps', 'machine', 'Tricep extension machine'),

  // QUADS
  createExercise('Barbell Squat', 'quads', 'barbell', 'Back squat with barbell'),
  createExercise('Front Squat', 'quads', 'barbell', 'Front squat with barbell'),
  createExercise('Goblet Squat', 'quads', 'dumbbell', 'Goblet squat with dumbbell'),
  createExercise('Leg Press', 'quads', 'machine', 'Leg press machine'),
  createExercise('Hack Squat', 'quads', 'machine', 'Hack squat machine'),
  createExercise('Leg Extension', 'quads', 'machine', 'Leg extension machine'),
  createExercise('Bulgarian Split Squat', 'quads', 'dumbbell', 'Bulgarian split squat'),
  createExercise('Lunges', 'quads', 'dumbbell', 'Walking or stationary lunges'),
  createExercise('Step-ups', 'quads', 'dumbbell', 'Step-ups with dumbbells'),
  createExercise('Sissy Squat', 'quads', 'bodyweight', 'Sissy squat for quad isolation'),

  // HAMSTRINGS
  createExercise('Romanian Deadlift', 'hamstrings', 'barbell', 'Romanian deadlift with barbell'),
  createExercise('Stiff Leg Deadlift', 'hamstrings', 'barbell', 'Stiff leg deadlift'),
  createExercise('Dumbbell Romanian Deadlift', 'hamstrings', 'dumbbell', 'Romanian deadlift with dumbbells'),
  createExercise('Lying Leg Curl', 'hamstrings', 'machine', 'Lying hamstring curl machine'),
  createExercise('Seated Leg Curl', 'hamstrings', 'machine', 'Seated hamstring curl machine'),
  createExercise('Good Morning', 'hamstrings', 'barbell', 'Good morning with barbell'),
  createExercise('Nordic Curl', 'hamstrings', 'bodyweight', 'Nordic hamstring curl'),
  createExercise('Single Leg Deadlift', 'hamstrings', 'dumbbell', 'Single leg Romanian deadlift'),

  // GLUTES
  createExercise('Hip Thrust', 'glutes', 'barbell', 'Barbell hip thrust'),
  createExercise('Glute Bridge', 'glutes', 'barbell', 'Weighted glute bridge'),
  createExercise('Cable Kickback', 'glutes', 'cable', 'Cable glute kickback'),
  createExercise('Glute Kickback Machine', 'glutes', 'machine', 'Glute kickback machine'),
  createExercise('Sumo Squat', 'glutes', 'dumbbell', 'Wide stance sumo squat'),
  createExercise('Cable Pull Through', 'glutes', 'cable', 'Cable pull through'),

  // CALVES
  createExercise('Standing Calf Raise', 'calves', 'machine', 'Standing calf raise machine'),
  createExercise('Seated Calf Raise', 'calves', 'machine', 'Seated calf raise machine'),
  createExercise('Leg Press Calf Raise', 'calves', 'machine', 'Calf raises on leg press'),
  createExercise('Dumbbell Calf Raise', 'calves', 'dumbbell', 'Single leg dumbbell calf raise'),
  createExercise('Smith Machine Calf Raise', 'calves', 'machine', 'Calf raises on Smith machine'),

  // CORE
  createExercise('Plank', 'core', 'bodyweight', 'Standard plank hold'),
  createExercise('Crunches', 'core', 'bodyweight', 'Standard crunches'),
  createExercise('Hanging Leg Raise', 'core', 'bodyweight', 'Hanging leg raises'),
  createExercise('Cable Crunch', 'core', 'cable', 'Kneeling cable crunch'),
  createExercise('Ab Wheel Rollout', 'core', 'other', 'Ab wheel rollout'),
  createExercise('Russian Twist', 'core', 'dumbbell', 'Seated Russian twist'),
  createExercise('Leg Raise', 'core', 'bodyweight', 'Lying leg raises'),
  createExercise('Dead Bug', 'core', 'bodyweight', 'Dead bug exercise'),
  createExercise('Mountain Climbers', 'core', 'bodyweight', 'Mountain climbers'),
  createExercise('Wood Chop', 'core', 'cable', 'Cable wood chop'),
];

// Category display names
export const categoryLabels: Record<ExerciseCategory, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  full_body: 'Full Body',
};

// Equipment display names
export const equipmentLabels: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  other: 'Other',
};
