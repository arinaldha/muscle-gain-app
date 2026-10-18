import raw from "@/data/program.json";
import type { Food, Program } from "./types";

export const program = raw as unknown as Program;

export const foodMap: Record<string, Food> = Object.fromEntries(program.foods.map((f) => [f.name, f]));

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export const LIFTS = ["Back Squat (barbell)", "Barbell Bench Press", "Trap Bar Deadlift", "Lat Pulldown"] as const;

export const allExercises: string[] = Array.from(
  new Set(program.workout.sessions.flatMap((s) => s.exercises.map((e) => e.name)))
);
