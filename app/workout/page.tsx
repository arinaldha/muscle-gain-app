"use client";

import { useEffect, useMemo, useState } from "react";
import { e1rm, fmt, fmtDate, isDeload, phaseOf, progressionHint, setsFor, targetRir, todayISO, weekdayName, weekOf } from "@/lib/calc";
import { program } from "@/lib/program";
import { useStore } from "@/lib/store";
import type { WorkoutEntry } from "@/lib/types";

type Row = { weight: string; reps: string[]; rir: string; pain: string; note: string };
const PAIN = ["Tidak ada", "Pegal normal", "Lelah", "Nyeri sendi ringan", "Nyeri tajam - hentikan"];

export default function WorkoutPage() {
  const { data, settings: s, addWorkouts, deleteWorkout, upsertBody } = useStore();
  const [date, setDate] = useState(todayISO());
  const week = Math.max(1, Math.min(26, weekOf(date, s.startDate)));
  const defaultSession = program.workout.sessions.find((x) => x.day === weekdayName(date))?.id ?? program.workout.sessions[0].id;
  const [sid, setSid] = useState(defaultSession);
  useEffect(() => setSid(defaultSession), [defaultSession]);
  const session = program.workout.sessions.find((x) => x.id === sid)!;
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [msg, setMsg] = useState("");
  const [minimal, setMinimal] = useState(false);

  const exercises = session.exercises.filter((e) => !minimal || e.priority === "Wajib");
  useEffect(() => {
    const r: Record<string, Row> = {};
    session.exercises.forEach((e) => (r[e.name] = { weight: "", reps: Array(setsFor(e, week)).fill(""), rir: "", pain: "", note: "" }));
    setRows(r);
  }, [sid, week]); // eslint-disable-line react-hooks/exhaustive-deps

  const histFor = (name: string) => data.workouts.filter((w) => w.exercise === name);
  const upd = (name: string, patch: Partial<Row>) => setRows((p) => ({ ...p, [name]: { ...p[name], ...patch } }));
  const n = (v: string) => {
    const x = parseFloat(v.replace(",", "."));
    return Number.isFinite(x) ? x : NaN;
  };

  const save = () => {
    const out: Omit<WorkoutEntry, "id">[] = [];
    for (const e of exercises) {
      const r = rows[e.name];
      if (!r) continue;
      const reps = r.reps.map(n).filter((x) => Number.isFinite(x) && x > 0);
      const w = n(r.weight);
      if (!reps.length) continue;
      out.push({ date, session: session.name, exercise: e.name, weight: Number.isFinite(w) ? w : 0, reps, rir: r.rir === "" ? undefined : Number(r.rir), pain: r.pain || undefined, note: r.note.trim() || undefined });
    }
    if (!out.length) return setMsg("Isi minimal reps satu latihan.");
    addWorkouts(out);
    const body = data.body.find((b) => b.date === date);
    upsertBody({ ...(body || { date }), gym: true });
    setMsg(`${out.length} latihan tersimpan. Hari ini otomatis ditandai "Gym".`);
    const r: Record<string, Row> = {};
    session.exercises.forEach((e) => (r[e.name] = { weight: "", reps: Array(setsFor(e, week)).fill(""), rir: "", pain: "", note: "" }));
    setRows(r);
  };

  const history = useMemo(() => {
    const byDate: Record<string, WorkoutEntry[]> = {};
    data.workouts.forEach((w) => (byDate[w.date] ||= []).push(w));
    return Object.entries(byDate).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [data.workouts]);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Latihan</h1>
        <p className="muted">Minggu {week} · {phaseOf(week)}{isDeload(week) ? " — set dipotong ±50%, beban ±90%, RIR 4" : ""}. Isi beban & reps tiap set, plus RIR set pertama.</p>
      </div>

      <section className="card">
        <div className="grid g3">
          <div className="field"><label>Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label>Sesi</label>
            <select value={sid} onChange={(e) => setSid(e.target.value)}>
              {program.workout.sessions.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.day})</option>)}
            </select>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <label className="check"><input type="checkbox" checked={minimal} onChange={(e) => setMinimal(e.target.checked)} /> Hanya 45 menit / mode minimum (latihan Wajib saja)</label>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>{program.workout.warmup}</p>
      </section>

      <section className="card">
        <h2>{session.title}</h2>
        {exercises.map((e, i) => {
          const r = rows[e.name];
          if (!r) return null;
          const hist = histFor(e.name);
          const last = [...hist].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
          const hint = progressionHint(e, hist, week);
          return (
            <div className="ex" key={e.name}>
              <div className="ex-head">
                <h3>{i + 1}. {e.name} <span className={`pill ${e.priority === "Wajib" ? "good" : ""}`}>{e.priority}</span></h3>
                <span className="small muted">{setsFor(e, week)} × {e.reps} · RIR {targetRir(e.rir, week)} · istirahat {Math.round(e.restSec / 60 * 10) / 10} mnt</span>
              </div>
              <p className="small muted" style={{ margin: "2px 0 8px" }}>
                {e.muscle}{e.secondary !== "—" ? `, ${e.secondary}` : ""}
                {last && <> · Terakhir {fmtDate(last.date)}: <b>{last.weight} kg × {last.reps.join("/")}</b>{last.rir != null ? ` @RIR ${last.rir}` : ""}</>}
              </p>
              <div className={`note ${hint.tone === "good" ? "good" : hint.tone === "warn" ? "warn" : ""}`} style={{ marginBottom: 10 }}>{hint.text}</div>
              <div className="grid g3">
                <div className="field"><label>Beban (kg)</label><input inputMode="decimal" value={r.weight} onChange={(ev) => upd(e.name, { weight: ev.target.value })} placeholder={last ? String(last.weight) : ""} /></div>
                <div className="field"><label>RIR set 1</label>
                  <select value={r.rir} onChange={(ev) => upd(e.name, { rir: ev.target.value })}>
                    <option value="">–</option>{[0, 1, 2, 3, 4, 5].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div className="field"><label>Nyeri / kelelahan</label>
                  <select value={r.pain} onChange={(ev) => upd(e.name, { pain: ev.target.value })}>
                    <option value="">–</option>{PAIN.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ marginTop: 8 }}>Reps per set</label>
              <div className="sets">
                {r.reps.map((v, k) => (
                  <input key={k} inputMode="numeric" aria-label={`Set ${k + 1}`} placeholder={`S${k + 1}`} value={v}
                    onChange={(ev) => upd(e.name, { reps: r.reps.map((x, j) => (j === k ? ev.target.value : x)) })} />
                ))}
                <button className="btn ghost sm" type="button" onClick={() => upd(e.name, { reps: [...r.reps, ""] })}>+ set</button>
              </div>
              {r.pain.startsWith("Nyeri tajam") && <div className="note bad" style={{ marginTop: 8 }}>Hentikan latihan ini. Nyeri tajam, bengkak, atau &gt;1 minggu → konsultasi dokter/fisioterapis.</div>}
              <details style={{ marginTop: 8 }}>
                <summary>Teknik, alternatif & catatan</summary>
                <p className="small" style={{ marginTop: 6 }}><b>Teknik:</b> {e.notes}</p>
                <p className="small"><b>Alternatif:</b> {e.alternative}</p>
                <input placeholder="Catatan performa" value={r.note} onChange={(ev) => upd(e.name, { note: ev.target.value })} />
              </details>
            </div>
          );
        })}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={save}>Simpan sesi</button>
          {msg && <span className="small muted">{msg}</span>}
        </div>
      </section>

      <section className="card">
        <h2>Riwayat latihan</h2>
        {history.length === 0 ? <div className="empty">Belum ada sesi tercatat.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Sesi</th><th>Latihan</th><th className="r">Beban</th><th>Reps</th><th className="r">RIR</th><th className="r">e1RM</th><th>Nyeri</th><th></th></tr></thead>
              <tbody>
                {history.slice(0, 30).flatMap(([d, ws]) =>
                  ws.map((w) => (
                    <tr key={w.id}>
                      <td>{fmtDate(d)}</td><td>{w.session}</td><td>{w.exercise}</td><td className="r">{fmt(w.weight)}</td><td>{w.reps.join(" / ")}</td>
                      <td className="r">{w.rir ?? "–"}</td><td className="r">{fmt(e1rm(w))}</td>
                      <td>{w.pain ? <span className={`pill ${w.pain.startsWith("Nyeri") ? "bad" : ""}`}>{w.pain}</span> : "–"}</td>
                      <td><button className="btn danger sm" onClick={() => confirm("Hapus baris ini?") && deleteWorkout(w.id)}>Hapus</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid g2">
        <div className="card">
          <h2>Aturan progressive overload</h2>
          <table><tbody>{program.workout.progressionRules.map((r) => <tr key={r.title}><td style={{ width: "30%" }}><b>{r.title}</b></td><td className="small">{r.text}</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h2>Penyesuaian situasi</h2>
          <table><tbody>{program.workout.adjustments.map((r) => <tr key={r.situation}><td style={{ width: "30%" }}><b>{r.situation}</b></td><td className="small">{r.action}</td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="card">
        <h2>Periodisasi 26 minggu</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fase</th><th>Minggu</th><th>Fokus</th><th>Volume</th><th>RIR</th><th>Catatan</th></tr></thead>
            <tbody>{program.workout.phases.map((p) => <tr key={p.name}><td><b>{p.name}</b></td><td>{p.weeks}</td><td>{p.focus}</td><td>{p.volume}</td><td>{p.rir}</td><td className="small">{p.notes}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
