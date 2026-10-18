import type { AppData } from "./types";

export function isAppData(x: unknown): x is AppData {
  const d = x as AppData;
  return (
    !!d && typeof d === "object" && d.version === 1 && typeof d.updatedAt === "string" &&
    Array.isArray(d.body) && Array.isArray(d.workouts) && !!d.reviews && typeof d.reviews === "object" &&
    !!d.settings && typeof d.settings === "object"
  );
}
