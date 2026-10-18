"use client";

import Link from "next/link";
import Chart from "@/components/Chart";
import { compliance, computeTargets, fmt, fmtDate, phaseOf, sumNutrition, todayISO, weekdayName, weekOf, weeklyStats } from "@/lib/calc";
import { LIFTS, program } from "@/lib/program";
import { useStore } from "@/lib/store";

const pct = (v: number | null) => (v == null ? "–" : `${Math.round(v * 100)}%`);
const tone = (v: number | null, ok: number) => (v == null ? "" : v >= ok ? "good" : "bad");

export default function Dashboard() {
  const { data, settings: s } = useStore();
  const t = computeTargets(s);
  const today = todayISO();
  const weekRaw = weekOf(today, s.startDate);
  const week = Math.max(0, Math.min(26, weekRaw));
  const rows = weeklyStats(data, s);
  const c = compliance(data, s, t, week, rows);
  const lastRow = [...rows].reverse().find((r) => r.avgWeight != null);
  const day = weekdayName(today);
  const session = program.workout.sessions.find((x) => x.day === day);
  const meals = program.mealPlan[day] || [];
  const dayTotals = sumNutrition(meals);
  const sched = program.schedule[day] || [];
  const todayLog = data.body.find((b) => b.date === today);

  const liftColors = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
  const liftFirst = (l: string) => rows.find((r) => r.lifts[l] != null)?.lifts[l] ?? null;
  const liftLast = (l: string) => [...rows].reverse().find((r) => r.lifts[l] != null)?.lifts[l] ?? null;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Dashboard</h1>
        <p className="muted">
          {weekRaw < 1
            ? `Program mulai ${fmtDate(s.startDate)} (Senin). Hari ini ${day}, ${fmtDate(today)}.`
            : weekRaw > 26
              ? "Program 26 minggu selesai — lihat Review untuk evaluasi akhir."
              : `Minggu ${week} dari 26 · ${phaseOf(week)} · ${day}, ${fmtDate(today)}`}
        </p>
      </div>

      {!todayLog?.weight && weekRaw >= 1 && (
        <div className="note warn">
          Berat pagi ini belum dicatat. <Link href="/log">Isi log harian →</Link>
        </div>
      )}

      <section className="grid g4">
        <div className="card stat"><div className="label">Kalori / hari</div><div className="value">{t.kcal.toLocaleString("id-ID")}</div><div className="sub">TDEE ±{Math.round(t.tdee).toLocaleString("id-ID")} + surplus {s.surplusKcal}</div></div>
        <div className="card stat"><div className="label">Protein</div><div className="value">{t.protein} g</div><div className="sub">{fmt(t.protein / s.weightKg)} g/kg · ±{t.proteinPerMeal} g per makan</div></div>
        <div className="card stat"><div className="label">Karbo / Lemak</div><div className="value">{t.carbs} / {t.fat} g</div><div className="sub">Serat {t.fiber} g · Air {fmt(t.waterL)} L+</div></div>
        <div className="card stat"><div className="label">Target BB minggu 26</div><div className="value">{fmt(t.finalTarget)} kg</div><div className="sub">+{fmt(s.targetGainPerWeek, 2)} kg/minggu dari {fmt(s.weightKg)} kg</div></div>
      </section>

      <section className="grid g2">
        <div className="card">
          <h2>Status berat badan</h2>
          {lastRow ? (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="stat"><div className="label">Rata-rata minggu {lastRow.week}</div><div className="value">{fmt(lastRow.avgWeight, 2)} kg</div><div className="sub">Target {fmt(lastRow.target, 2)} kg · selisih {fmt((lastRow.avgWeight ?? 0) - lastRow.target, 2)}</div></div>
                <div className="stat"><div className="label">Laju 2 minggu</div><div className="value">{lastRow.rate2 == null ? "–" : `${lastRow.rate2 > 0 ? "+" : ""}${fmt(lastRow.rate2, 2)}`}</div><div className="sub">rentang sehat {fmt(s.minGainPerWeek, 2)}–{fmt(s.maxGainPerWeek, 2)} kg/mg</div></div>
              </div>
              <div className={`note ${/naikkan|turunkan/i.test(lastRow.suggestion) ? "warn" : "good"}`} style={{ marginTop: 10 }}>
                <b>Saran:</b> {lastRow.suggestion}
                {data.reviews[lastRow.week]?.decision && <> · <b>Keputusan Anda:</b> {data.reviews[lastRow.week]?.decision}</>}
              </div>
            </>
          ) : (
            <p className="muted">Belum ada data berat. Timbang setiap pagi (setelah buang air, sebelum makan) di <Link href="/log">Log Harian</Link>. Keputusan kalori memakai tren 2–3 minggu, bukan satu kali timbang.</p>
          )}
          <div className="spacer" />
          <Chart
            series={[
              { name: "Target", color: "var(--muted)", dashed: true, points: rows.map((r) => ({ x: r.week, y: r.target })) },
              { name: "Rata-rata aktual", color: "var(--c2)", dots: true, points: rows.map((r) => ({ x: r.week, y: r.avgWeight })) },
            ]}
            xLabel={(x) => `M${x}`}
            yFmt={(y) => y.toFixed(1)}
          />
        </div>

        <div className="card">
          <h2>Kepatuhan</h2>
          <table>
            <tbody>
              <tr><td>Sesi gym s.d. minggu ini</td><td className="r"><span className={`pill ${tone(c.gym, 0.8)}`}>{pct(c.gym)}</span></td></tr>
              <tr><td>Hari nutrisi sesuai target (±10% kkal, ≥90% protein)</td><td className="r"><span className={`pill ${tone(c.nutrition, 0.7)}`}>{pct(c.nutrition)}</span></td></tr>
              <tr><td>Rata-rata protein tercatat</td><td className="r">{c.proteinAvg == null ? "–" : `${Math.round(c.proteinAvg)} g`} <span className={`pill ${tone(c.proteinAvg == null ? null : c.proteinAvg / t.protein, 0.9)}`}>{pct(c.proteinAvg == null ? null : c.proteinAvg / t.protein)}</span></td></tr>
              <tr><td>Rata-rata kalori tercatat</td><td className="r">{c.kcalAvg == null ? "–" : Math.round(c.kcalAvg).toLocaleString("id-ID")}</td></tr>
              <tr><td>Rata-rata tidur</td><td className="r">{c.sleepAvg == null ? "–" : `${fmt(c.sleepAvg)} jam`}</td></tr>
              <tr><td>Malam tidur ≥7 jam</td><td className="r"><span className={`pill ${tone(c.sleep7, 0.7)}`}>{pct(c.sleep7)}</span></td></tr>
            </tbody>
          </table>
          <div className="spacer" />
          <h3>Progres latihan utama (e1RM, kg)</h3>
          <table>
            <thead><tr><th>Latihan</th><th className="r">Awal</th><th className="r">Terbaru</th><th className="r">Δ</th></tr></thead>
            <tbody>
              {LIFTS.map((l) => {
                const a = liftFirst(l), b = liftLast(l);
                return (
                  <tr key={l}><td>{l}</td><td className="r">{fmt(a)}</td><td className="r">{fmt(b)}</td><td className="r">{a && b ? `${b >= a ? "+" : ""}${Math.round((b / a - 1) * 100)}%` : "–"}</td></tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>e1RM per minggu</h2>
        <p className="muted small">e1RM = beban × (1 + (reps set 1 + RIR) / 30). Estimasi kekuatan, bukan uji 1RM.</p>
        <Chart
          series={LIFTS.map((l, i) => ({ name: l, color: liftColors[i], dots: true, points: rows.map((r) => ({ x: r.week, y: r.lifts[l] })) }))}
          xLabel={(x) => `M${x}`}
          yPad={2}
          emptyText="Belum ada log latihan untuk Squat, Bench, Trap Bar DL, atau Lat Pulldown."
          width={1100}
          height={260}
        />
      </section>

      <section className="grid g3">
        <div className="card">
          <h2>Latihan hari ini</h2>
          {session ? (
            <>
              <p><b>{session.title}</b></p>
              <ul className="small" style={{ paddingLeft: 18, margin: "0 0 10px" }}>
                {session.exercises.map((e) => <li key={e.name}>{e.name} — {e.reps}</li>)}
              </ul>
              <Link className="btn" href="/workout">Mulai catat sesi</Link>
            </>
          ) : (
            <p className="muted">Tidak ada sesi gym hari ini. {day === "Sabtu" ? "Sepak bola opsional." : day === "Minggu" ? "Jogging santai opsional + meal prep." : "Fokus tesis & pemulihan."}</p>
          )}
        </div>
        <div className="card">
          <h2>Menu hari ini</h2>
          <ul className="timeline">
            {meals.map((m) => (
              <li key={m.time + m.slot}><span className="t">{m.time}</span><span className="small"><b>{m.slot}</b><br />{m.menu}</span></li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 8 }}>
            {Math.round(dayTotals.kcal).toLocaleString("id-ID")} kkal · {Math.round(dayTotals.protein)} g protein · Rp{Math.round(dayTotals.cost).toLocaleString("id-ID")}
          </p>
        </div>
        <div className="card">
          <h2>Jadwal hari ini</h2>
          <ul className="timeline">
            {sched.filter((b) => ["Gym", "Tesis", "Makan", "Tidur", "Aktivitas tambahan", "Meal prep"].includes(b.category)).map((b) => (
              <li key={b.start + b.activity}><span className="t">{b.start}–{b.end}</span><span className="small">{b.activity}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Target progres 6 bulan</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bulan</th><th className="r">Minggu</th><th className="r">Target BB</th><th className="r">Rentang</th><th className="r">Maks. pinggang*</th><th>Fokus</th><th>Indikator</th></tr></thead>
            <tbody>
              {program.monthlyTargets.map((m) => {
                const tgt = s.weightKg + s.targetGainPerWeek * m.week;
                return (
                  <tr key={m.month}>
                    <td>{m.month}</td><td className="r">{m.week}</td><td className="r">{fmt(tgt)}</td>
                    <td className="r">{fmt(s.weightKg + s.minGainPerWeek * m.week)}–{fmt(s.weightKg + s.maxGainPerWeek * m.week)}</td>
                    <td className="r">{s.waistStartCm ? fmt(s.waistStartCm + 0.5 * (tgt - s.weightKg)) : <Link href="/settings">isi</Link>}</td>
                    <td>{m.focus}</td><td className="small">{m.indicator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          * Heuristik praktis: pinggang naik ≤ ±0,5 cm per 1 kg BB. Kenaikan BB ≠ massa bebas lemak ≠ massa otot; proporsinya bervariasi dan tak bisa diukur akurat tanpa DEXA. Bulan pertama BB sering naik 0,5–1 kg lebih cepat (air & glikogen).
        </p>
      </section>
    </div>
  );
}
