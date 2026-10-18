import { foodMap, LIFTS, program } from "./program";
import type { AppData, BodyEntry, Exercise, Meal, Settings, WorkoutEntry } from "./types";

/* ---------------- dates (timezone-safe, YYYY-MM-DD) ---------------- */
const pad = (n: number) => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const dayNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
export const addDays = (iso: string, n: number) => {
  const d = new Date((dayNum(iso) + n) * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const WD = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const weekdayName = (iso: string) => WD[new Date(dayNum(iso) * 86400000).getUTCDay()];
export const weekOf = (iso: string, start: string) => Math.floor((dayNum(iso) - dayNum(start)) / 7) + 1;
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
export const fmtRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const fmt = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n) ? "–" : n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/* ---------------- energy & macro targets (same formulas as the Excel) ---------------- */
export function computeTargets(s: Settings) {
  const w = s.weightKg;
  const bmr = 10 * w + 6.25 * s.heightCm - 5 * s.age + (s.sex === "Laki-laki" ? 5 : -161);
  const base = bmr * s.activityFactor;
  const gymWeek = ((s.metGym - 1) * w * s.gymMinutes) / 60 * s.gymSessionsPerWeek;
  const cyclingWeek = ((s.metCycling - 1) * w * s.cyclingMinutesPerGymDay) / 60 * s.cyclingDaysPerWeek;
  const extraWeek = ((s.metFootball - 1) * w * s.footballMinutesPerWeek) / 60 + ((s.metJogging - 1) * w * s.joggingMinutesPerWeek) / 60;
  const tdee = base + (gymWeek + cyclingWeek + extraWeek) / 7;
  const kcal = Math.round((tdee + s.surplusKcal) / 50) * 50;
  const protein = Math.round(s.proteinPerKg * w);
  const fat = Math.round((kcal * s.fatPct) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  const bmi = w / (s.heightCm / 100) ** 2;
  const bmiLabel =
    bmi < 18.5 ? "Kurang" : bmi < 23 ? "Normal" : bmi < 25 ? "Berisiko (Asia 23–24,9) — BMI tak membedakan otot & lemak" : bmi < 30 ? "Obesitas I" : "Obesitas II";
  return {
    bmi, bmiLabel, bmr, base, gymWeek, cyclingWeek, extraWeek, tdee,
    tdeeLow: Math.round((tdee * 0.93) / 10) * 10,
    tdeeHigh: Math.round((tdee * 1.07) / 10) * 10,
    kcal, protein, fat, carbs,
    fiber: Math.round((kcal / 1000) * 14),
    waterL: Math.round(w * 0.035 * 10) / 10,
    proteinPerMeal: Math.round(0.4 * w),
    finalTarget: w + s.targetGainPerWeek * 26,
  };
}
export type Targets = ReturnType<typeof computeTargets>;

export const targetWeightAt = (s: Settings, week: number) => s.weightKg + s.targetGainPerWeek * week;
export const targetWeightOnDate = (s: Settings, iso: string) => s.weightKg + (s.targetGainPerWeek * (dayNum(iso) - dayNum(s.startDate))) / 7;

/* ---------------- program phases ---------------- */
export function phaseOf(week: number) {
  if (week <= 0) return "Belum mulai";
  if (week <= 4) return "F1 Adaptasi & teknik";
  if (week <= 12) return "F2 Volume & kekuatan";
  if (week === 13) return "Deload + evaluasi";
  if (week <= 21) return "F3 Progres lanjutan";
  if (week <= 24) return "F4 Konsolidasi";
  if (week === 25) return "Uji performa (RIR 1)";
  if (week === 26) return "Deload + evaluasi akhir";
  return "Program selesai";
}
export const isDeload = (week: number) => week === 13 || week === 26;
export const setsFor = (ex: Exercise, week: number) =>
  week <= 4 ? ex.setsPhase1 : isDeload(week) ? Math.ceil(ex.setsPhase2 / 2) : ex.setsPhase2;

export function repRange(reps: string, week = 5): [number, number] {
  const f1 = reps.match(/F1:\s*(\d+)\s*[–-]\s*(\d+)/);
  if (f1 && week <= 4) return [Number(f1[1]), Number(f1[2])];
  const m = reps.match(/(\d+)\s*[–-]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [8, 12];
}
export function targetRir(rir: string, week: number): number {
  if (isDeload(week)) return 4;
  if (week <= 2) return 3;
  if (rir.includes("F1:")) return week <= 4 ? 3 : 2;
  const nums = (rir.match(/\d+/g) || []).map(Number);
  if (rir.includes("→") && nums.length >= 2) return week <= 4 ? nums[0] : nums[1];
  return nums[0] ?? 2;
}
function loadStep(ex: Exercise) {
  if (/DB|Dumbbell|Bulgarian|Incline DB|Lateral/i.test(ex.name)) return "+1–2 kg per dumbel";
  if (/Machine|Cable|Leg Press|Leg Curl|Leg Extension|Pulldown|Calf|Face Pull|Crunch/i.test(ex.name)) return "+1 pin (±2,5–5 kg)";
  if (["Quads", "Hamstring", "Glutes"].includes(ex.muscle)) return "+2,5–5 kg";
  return "+2,5 kg";
}

export const e1rm = (w: WorkoutEntry) =>
  w.weight > 0 && w.reps.length && w.reps[0] > 0 ? Math.round(w.weight * (1 + (w.reps[0] + (w.rir ?? 0)) / 30) * 10) / 10 : null;

/** Double-progression advice from the last logged sessions of one exercise. */
export function progressionHint(ex: Exercise, history: WorkoutEntry[], week: number) {
  const [lo, hi] = repRange(ex.reps, week);
  const sets = setsFor(ex, week);
  const rirT = targetRir(ex.rir, week);
  if (isDeload(week)) return { tone: "info" as const, text: `Deload: ${sets} set, beban ±90% dari terakhir, RIR 4.` };
  const h = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = h[0];
  if (!last) return { tone: "info" as const, text: `Belum ada data. Pilih beban yang bisa ${hi} reps @RIR ${Math.max(rirT, 3)} dengan teknik rapi.` };
  if (h.length >= 3) {
    const [a, b, c] = h;
    const tot = (x: WorkoutEntry) => x.reps.reduce((s, r) => s + r, 0);
    if (a.weight === b.weight && b.weight === c.weight && tot(a) <= tot(c)) {
      return { tone: "warn" as const, text: `Stagnan 3 sesi di ${last.weight} kg. Cek tidur/kalori, lalu turunkan 5–10% dan bangun ulang reps.` };
    }
  }
  const done = last.reps.slice(0, sets);
  const allTop = done.length >= sets && done.every((r) => r >= hi) && (last.rir ?? rirT) >= rirT;
  if (allTop) return { tone: "good" as const, text: `Naikkan beban: ${last.weight} kg → ${loadStep(ex)}. Reps kembali ke ±${lo}.` };
  if (done.some((r) => r < lo)) return { tone: "info" as const, text: `Tahan ${last.weight} kg. Kejar minimal ${lo} reps di semua set.` };
  return { tone: "info" as const, text: `Tahan ${last.weight} kg, tambah 1 rep di set yang belum ${hi}.` };
}

/* ---------------- meals & shopping ---------------- */
export const pricePer100 = (name: string) => {
  const f = foodMap[name];
  return f ? (f.buyPrice / (f.gramsPerUnit * f.ediblePct)) * 100 : 0;
};
export function itemNutrition(food: string, grams: number) {
  const f = foodMap[food];
  if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 };
  const k = grams / 100;
  return { kcal: f.kcal * k, protein: f.protein * k, carbs: f.carbs * k, fat: f.fat * k, fiber: f.fiber * k, cost: pricePer100(food) * k };
}
export function sumNutrition(meals: Meal[]) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 };
  for (const m of meals)
    for (const it of m.items) {
      const n = itemNutrition(it.food, it.grams);
      (Object.keys(t) as (keyof typeof t)[]).forEach((k) => (t[k] += n[k]));
    }
  return t;
}
export function shoppingList() {
  const grams: Record<string, number> = {};
  Object.values(program.mealPlan).forEach((meals) => meals.forEach((m) => m.items.forEach((i) => (grams[i.food] = (grams[i.food] || 0) + i.grams))));
  return Object.entries(grams).map(([name, g]) => {
    const f = foodMap[name];
    const buyGrams = g / f.ediblePct;
    return { name, category: f.category, grams: g, buyGrams, unit: f.buyUnit, units: buyGrams / f.gramsPerUnit, unitPrice: f.buyPrice, cost: (pricePer100(name) * g) / 100, note: program.storageNotes[name] || "" };
  });
}

/* ---------------- weekly aggregation ---------------- */
export function rollingAvg(body: BodyEntry[], iso: string) {
  const xs = body.filter((b) => b.weight != null && dayNum(b.date) <= dayNum(iso) && dayNum(b.date) > dayNum(iso) - 7).map((b) => b.weight!);
  return xs.length >= 4 ? avg(xs) : null;
}

export function suggestion(week: number, avgW: number | null, rate2: number | null, s: Settings) {
  if (avgW == null) return "";
  if (week <= 2) return "Minggu awal: kenaikan air/glikogen wajar — pertahankan";
  if (rate2 == null) return "Data 2 minggu belum lengkap — pertahankan";
  if (rate2 < s.minGainPerWeek) return "Laju lambat: naikkan 100–150 kkal/hari";
  if (rate2 > s.maxGainPerWeek) return "Laju cepat: turunkan 100–150 kkal/hari";
  return "Pertahankan kalori";
}

export function weeklyStats(data: AppData, s: Settings) {
  const rows: {
    week: number; start: string; end: string; phase: string; target: number; avgWeight: number | null; delta: number | null; rate2: number | null;
    waist: number | null; kcal: number | null; protein: number | null; planned: number; gymDone: number; sleep: number | null; nights7: number;
    lifts: Record<string, number | null>; suggestion: string;
  }[] = [];
  for (let w = 1; w <= 26; w++) {
    const start = addDays(s.startDate, 7 * (w - 1));
    const end = addDays(start, 6);
    const inW = (iso: string) => iso >= start && iso <= end;
    const b = data.body.filter((x) => inW(x.date));
    const pick = (k: keyof BodyEntry) => avg(b.map((x) => x[k]).filter((v): v is number => typeof v === "number"));
    const avgWeight = pick("weight");
    const prev = w === 1 ? s.weightKg : rows[w - 2].avgWeight;
    const two = w >= 3 ? rows[w - 3].avgWeight : null;
    const wk = data.workouts.filter((x) => inW(x.date));
    const gymDates = new Set([...b.filter((x) => x.gym).map((x) => x.date), ...wk.map((x) => x.date)]);
    const lifts: Record<string, number | null> = {};
    for (const l of LIFTS) {
      const vals = wk.filter((x) => x.exercise === l).map(e1rm).filter((v): v is number => v != null);
      lifts[l] = vals.length ? Math.max(...vals) : null;
    }
    const rate2 = avgWeight != null && two != null ? (avgWeight - two) / 2 : null;
    rows.push({
      week: w, start, end, phase: phaseOf(w), target: targetWeightAt(s, w), avgWeight,
      delta: avgWeight != null && prev != null ? avgWeight - prev : null, rate2,
      waist: pick("waist"), kcal: pick("kcal"), protein: pick("protein"),
      planned: data.reviews[w]?.planned ?? s.gymSessionsPerWeek, gymDone: gymDates.size,
      sleep: pick("sleep"), nights7: b.filter((x) => (x.sleep ?? 0) >= 7).length,
      lifts, suggestion: suggestion(w, avgWeight, rate2, s),
    });
  }
  return rows;
}
export type WeekRow = ReturnType<typeof weeklyStats>[number];

export function compliance(data: AppData, s: Settings, t: Targets, currentWeek: number, rows: WeekRow[]) {
  const upto = rows.filter((r) => r.week <= currentWeek);
  const planned = upto.reduce((a, r) => a + r.planned, 0);
  const done = upto.reduce((a, r) => a + r.gymDone, 0);
  const withNut = data.body.filter((b) => b.kcal != null && b.protein != null);
  const ok = withNut.filter((b) => b.protein! >= 0.9 * t.protein && Math.abs(b.kcal! - t.kcal) <= 0.1 * t.kcal);
  const sleeps = data.body.map((b) => b.sleep).filter((v): v is number => v != null);
  return {
    gym: planned ? done / planned : null,
    nutrition: withNut.length ? ok.length / withNut.length : null,
    proteinAvg: avg(data.body.map((b) => b.protein).filter((v): v is number => v != null)),
    kcalAvg: avg(data.body.map((b) => b.kcal).filter((v): v is number => v != null)),
    sleepAvg: avg(sleeps),
    sleep7: sleeps.length ? sleeps.filter((x) => x >= 7).length / sleeps.length : null,
  };
}

export const sleepHours = (bed: string, wake: string) => {
  const m = (t: string) => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };
  return (((m(wake) - m(bed)) % 1440) + 1440) % 1440 / 60;
};
