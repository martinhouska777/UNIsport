/*
  EXERCISE CATALOG — the searchable library behind the Hevy-style gym logger.
  Data is the source of truth (rule 7): every exercise carries its primary
  MUSCLE group (what powers the calendar's body-part chips) and its EQUIPMENT
  (for filtering). Add an exercise here, not in a component.
*/

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Legs"
  | "Glutes"
  | "Calves"
  | "Core"
  | "Forearms";

// Order used by the filter chips + the calendar legend.
export const muscleGroups: MuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Calves",
  "Core",
  "Forearms",
];

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Machine"
  | "Cable"
  | "Bodyweight"
  | "Kettlebell"
  | "Other";

export type CatalogExercise = {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
};

export const exerciseCatalog: CatalogExercise[] = [
  // ── Chest ──
  { name: "Bench Press", muscle: "Chest", equipment: "Barbell" },
  { name: "Incline Bench Press", muscle: "Chest", equipment: "Barbell" },
  { name: "Dumbbell Bench Press", muscle: "Chest", equipment: "Dumbbell" },
  { name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell" },
  { name: "Machine Chest Press", muscle: "Chest", equipment: "Machine" },
  { name: "Cable Fly", muscle: "Chest", equipment: "Cable" },
  { name: "Dumbbell Fly", muscle: "Chest", equipment: "Dumbbell" },
  { name: "Pec Deck", muscle: "Chest", equipment: "Machine" },
  { name: "Push-Up", muscle: "Chest", equipment: "Bodyweight" },
  { name: "Chest Dip", muscle: "Chest", equipment: "Bodyweight" },

  // ── Back ──
  { name: "Deadlift", muscle: "Back", equipment: "Barbell" },
  { name: "Pull-Up", muscle: "Back", equipment: "Bodyweight" },
  { name: "Chin-Up", muscle: "Back", equipment: "Bodyweight" },
  { name: "Lat Pulldown", muscle: "Back", equipment: "Cable" },
  { name: "Bent-Over Row", muscle: "Back", equipment: "Barbell" },
  { name: "Dumbbell Row", muscle: "Back", equipment: "Dumbbell" },
  { name: "Seated Cable Row", muscle: "Back", equipment: "Cable" },
  { name: "T-Bar Row", muscle: "Back", equipment: "Barbell" },
  { name: "Face Pull", muscle: "Back", equipment: "Cable" },
  { name: "Barbell Shrug", muscle: "Back", equipment: "Barbell" },
  { name: "Back Extension", muscle: "Back", equipment: "Bodyweight" },

  // ── Shoulders ──
  { name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell" },
  { name: "Dumbbell Shoulder Press", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Arnold Press", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Cable Lateral Raise", muscle: "Shoulders", equipment: "Cable" },
  { name: "Front Raise", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Rear Delt Fly", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Upright Row", muscle: "Shoulders", equipment: "Barbell" },
  { name: "Machine Shoulder Press", muscle: "Shoulders", equipment: "Machine" },

  // ── Biceps ──
  { name: "Barbell Curl", muscle: "Biceps", equipment: "Barbell" },
  { name: "Dumbbell Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Hammer Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Preacher Curl", muscle: "Biceps", equipment: "Machine" },
  { name: "Cable Curl", muscle: "Biceps", equipment: "Cable" },
  { name: "Concentration Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Incline Dumbbell Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "EZ-Bar Curl", muscle: "Biceps", equipment: "Barbell" },

  // ── Triceps ──
  { name: "Tricep Pushdown", muscle: "Triceps", equipment: "Cable" },
  { name: "Rope Pushdown", muscle: "Triceps", equipment: "Cable" },
  { name: "Overhead Tricep Extension", muscle: "Triceps", equipment: "Dumbbell" },
  { name: "Skull Crusher", muscle: "Triceps", equipment: "Barbell" },
  { name: "Close-Grip Bench Press", muscle: "Triceps", equipment: "Barbell" },
  { name: "Tricep Dip", muscle: "Triceps", equipment: "Bodyweight" },
  { name: "Dumbbell Kickback", muscle: "Triceps", equipment: "Dumbbell" },

  // ── Legs ──
  { name: "Back Squat", muscle: "Legs", equipment: "Barbell" },
  { name: "Front Squat", muscle: "Legs", equipment: "Barbell" },
  { name: "Leg Press", muscle: "Legs", equipment: "Machine" },
  { name: "Romanian Deadlift", muscle: "Legs", equipment: "Barbell" },
  { name: "Lunge", muscle: "Legs", equipment: "Dumbbell" },
  { name: "Bulgarian Split Squat", muscle: "Legs", equipment: "Dumbbell" },
  { name: "Leg Extension", muscle: "Legs", equipment: "Machine" },
  { name: "Leg Curl", muscle: "Legs", equipment: "Machine" },
  { name: "Goblet Squat", muscle: "Legs", equipment: "Dumbbell" },
  { name: "Hack Squat", muscle: "Legs", equipment: "Machine" },

  // ── Glutes ──
  { name: "Hip Thrust", muscle: "Glutes", equipment: "Barbell" },
  { name: "Glute Bridge", muscle: "Glutes", equipment: "Barbell" },
  { name: "Cable Kickback", muscle: "Glutes", equipment: "Cable" },
  { name: "Step-Up", muscle: "Glutes", equipment: "Dumbbell" },
  { name: "Sumo Deadlift", muscle: "Glutes", equipment: "Barbell" },

  // ── Calves ──
  { name: "Standing Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Seated Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Calf Press", muscle: "Calves", equipment: "Machine" },

  // ── Core ──
  { name: "Plank", muscle: "Core", equipment: "Bodyweight" },
  { name: "Crunch", muscle: "Core", equipment: "Bodyweight" },
  { name: "Hanging Leg Raise", muscle: "Core", equipment: "Bodyweight" },
  { name: "Russian Twist", muscle: "Core", equipment: "Bodyweight" },
  { name: "Cable Crunch", muscle: "Core", equipment: "Cable" },
  { name: "Ab Wheel Rollout", muscle: "Core", equipment: "Other" },
  { name: "Sit-Up", muscle: "Core", equipment: "Bodyweight" },
  { name: "Mountain Climber", muscle: "Core", equipment: "Bodyweight" },

  // ── Forearms ──
  { name: "Wrist Curl", muscle: "Forearms", equipment: "Barbell" },
  { name: "Reverse Curl", muscle: "Forearms", equipment: "Barbell" },
  { name: "Farmer's Carry", muscle: "Forearms", equipment: "Dumbbell" },
];

// Substring search across name + muscle + equipment, optionally limited to one
// muscle group. Returns catalog order (already grouped by muscle).
export function searchExercises(query: string, muscle: MuscleGroup | null): CatalogExercise[] {
  const q = query.trim().toLowerCase();
  return exerciseCatalog.filter((e) => {
    if (muscle && e.muscle !== muscle) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.muscle.toLowerCase().includes(q) ||
      e.equipment.toLowerCase().includes(q)
    );
  });
}
