export interface Settings {
  startDate: string;
  age: number;
  sex: "Laki-laki" | "Perempuan";
  weightKg: number;
  heightCm: number;
  experience: string;
  dailyBudget: number;
  waistStartCm: number | null;
  activityFactor: number;
  metGym: number;
  gymMinutes: number;
  gymSessionsPerWeek: number;
  metCycling: number;
  cyclingMinutesPerGymDay: number;
  cyclingDaysPerWeek: number;
  metFootball: number;
  footballMinutesPerWeek: number;
  metJogging: number;
  joggingMinutesPerWeek: number;
  surplusKcal: number;
  proteinPerKg: number;
  fatPct: number;
  targetGainPerWeek: number;
  minGainPerWeek: number;
  maxGainPerWeek: number;
  bedTime: string;
  wakeTime: string;
}

export interface Food {
  name: string;
  category: string;
  condition: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  buyUnit: string;
  buyPrice: number;
  gramsPerUnit: number;
  ediblePct: number;
  householdPortion: string;
  source: string;
}

export interface Meal {
  time: string;
  slot: string;
  menu: string;
  items: { food: string; grams: number }[];
  alternative: string;
}

export interface Exercise {
  name: string;
  muscle: string;
  secondary: string;
  setsPhase1: number;
  setsPhase2: number;
  reps: string;
  rir: string;
  restSec: number;
  priority: string;
  alternative: string;
  notes: string;
}

export interface Session {
  id: string;
  name: string;
  day: string;
  title: string;
  exercises: Exercise[];
}

export interface ScheduleBlock {
  start: string;
  end: string;
  activity: string;
  category: string;
  note: string;
}

export interface Program {
  version: number;
  defaults: Settings;
  assumptionNotes: Record<string, string>;
  foods: Food[];
  mealPlan: Record<string, Meal[]>;
  storageNotes: Record<string, string>;
  workout: {
    sessions: Session[];
    warmup: string;
    progressionRules: { title: string; text: string }[];
    phases: { name: string; weeks: string; focus: string; volume: string; rir: string; notes: string }[];
    adjustments: { situation: string; action: string }[];
    weekly: { day: string; morning: string; evening: string; note: string }[];
  };
  monthlyTargets: { month: number; week: number; focus: string; indicator: string }[];
  schedule: Record<string, ScheduleBlock[]>;
  conflicts: { status: string; issue: string; impact: string; solution: string }[];
  foodGuide: { group: string; food: string; reason: string; portion: string; frequency: string }[];
  supplements: { name: string; evidence: string; who: string; dose: string; limits: string; cost: string }[];
  sources: string[];
}

/* ---------- user data (the JSON "database") ---------- */
export interface BodyEntry {
  date: string; // YYYY-MM-DD
  weight?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  sleep?: number;
  energy?: number;
  kcal?: number;
  protein?: number;
  gym?: boolean;
  note?: string;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  session: string;
  exercise: string;
  weight: number;
  reps: number[];
  rir?: number;
  pain?: string;
  note?: string;
}

export interface Review {
  planned?: number;
  obstacle?: string;
  decision?: string;
  note?: string;
}

export interface AppData {
  version: 1;
  updatedAt: string; // ISO timestamp
  settings: Partial<Settings>;
  body: BodyEntry[];
  workouts: WorkoutEntry[];
  reviews: Record<string, Review>;
}
