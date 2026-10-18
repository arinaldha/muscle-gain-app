"use client";

import { useState } from "react";
import { fmt, sleepHours, todayISO, weekdayName } from "@/lib/calc";
import { DAYS, program } from "@/lib/program";
import { useStore } from "@/lib/store";

const CAT: Record<string, string> = {
  Gym: "var(--c3)", Tesis: "var(--c1)", Tidur: "var(--c4)", Makan: "var(--c2)", Bersepeda: "#4c9a6a",
  "Aktivitas tambahan": "#c9a227", "Meal prep": "#b5651d", Kerja: "var(--muted)", Pemulihan: "#7a9e9f", Persiapan: "var(--line)", Transisi: "var(--line)",
};
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const dur = (a: string, b: string) => (((mins(b) - mins(a)) % 1440) + 1440) % 1440 / 60;

export default function SchedulePage() {
  const { settings: s } = useStore();
  const [day, setDay] = useState(weekdayName(todayISO()));
  const blocks = program.schedule[day] || [];
  const thesisWeek = DAYS.reduce((a, d) => a + (program.schedule[d] || []).filter((b) => b.category === "Tesis").reduce((x, b) => x + dur(b.start, b.end), 0), 0);
  const sleepNew = sleepHours(s.bedTime, s.wakeTime);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Jadwal Mingguan</h1>
        <p className="muted">Disusun di sekitar kerja 08:30–17:00 dan tesis yang tetap diprioritaskan.</p>
      </div>

      <section className="grid g4">
        <div className="card stat"><div className="label">Tidur jadwal baru</div><div className="value" style={{ color: sleepNew >= 7 ? "var(--good)" : "var(--bad)" }}>{fmt(sleepNew)} jam</div><div className="sub">{s.bedTime} → {s.wakeTime}</div></div>
        <div className="card stat"><div className="label">Tidur jadwal awal</div><div className="value" style={{ color: "var(--bad)" }}>{fmt(sleepHours("22:00", s.wakeTime))} jam</div><div className="sub">tesis s.d. 21:40</div></div>
        <div className="card stat"><div className="label">Tesis / minggu (baru)</div><div className="value">{fmt(thesisWeek)} jam</div><div className="sub">termasuk blok akhir pekan</div></div>
        <div className="card stat"><div className="label">Tesis / minggu (awal)</div><div className="value">{fmt(5 * dur("17:30", "21:40"))} jam</div><div className="sub">5 × 17:30–21:40</div></div>
      </section>

      <section className="card">
        <h2>Konflik & penyelesaian</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Status</th><th>Isu</th><th>Dampak</th><th>Usulan</th></tr></thead>
            <tbody>
              {program.conflicts.map((c) => (
                <tr key={c.issue}>
                  <td><span className={`pill ${c.status.includes("KONFLIK") ? "bad" : c.status.includes("KONFIRMASI") ? "warn" : "good"}`}>{c.status.replace("⚠ ", "")}</span></td>
                  <td>{c.issue}</td><td className="small">{c.impact}</td><td className="small">{c.solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="tabs">
          {DAYS.map((d) => <button key={d} className={`tab ${d === day ? "active" : ""}`} onClick={() => setDay(d)}>{d}{d === weekdayName(todayISO()) && <span className="dot" />}</button>)}
        </div>
        <ul className="timeline">
          {blocks.map((b) => (
            <li key={b.start + b.activity}>
              <span className="t">{b.start}–{b.end}</span>
              <span>
                <span className="cat" style={{ background: CAT[b.category] || "var(--line)" }} />
                {b.activity} <span className="small muted">· {b.category} · {fmt(dur(b.start, b.end))} j</span>
                {b.note && <div className={`small ${b.note.includes("KONFIRMASI") ? "" : "muted"}`}>{b.note.includes("KONFIRMASI") ? <span className="pill warn">{b.note.replace("⚠ ", "")}</span> : b.note}</div>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Ringkasan mingguan</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hari</th><th>Pagi</th><th>Malam</th><th>Catatan</th></tr></thead>
            <tbody>{program.workout.weekly.map((w) => <tr key={w.day}><td><b>{w.day}</b></td><td>{w.morning}</td><td>{w.evening}</td><td className="small muted">{w.note}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
