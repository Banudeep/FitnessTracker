// Pre-built Workout Templates

export interface TemplateDefinition {
  name: string;
  exercises: string[]; // Exercise names that match builtInExercises
}

export const presetTemplates: TemplateDefinition[] = [
  // Push/Pull/Legs (3 templates)
  {
    name: 'Push Day',
    exercises: [
      'Barbell Bench Press',
      'Incline Dumbbell Press',
      'Overhead Press',
      'Tricep Pushdown',
      'Lateral Raise',
    ],
  },
  {
    name: 'Pull Day',
    exercises: [
      'Barbell Row',
      'Lat Pulldown',
      'Seated Cable Row',
      'Face Pull',
      'Barbell Curl',
    ],
  },
  {
    name: 'Leg Day',
    exercises: [
      'Barbell Squat',
      'Romanian Deadlift',
      'Leg Press',
      'Lying Leg Curl',
      'Standing Calf Raise',
    ],
  },
];
