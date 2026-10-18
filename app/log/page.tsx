"use client";

import { useEffect, useState } from "react";
import Chart from "@/components/Chart";
import { computeTargets, dayNum, fmt, fmtDate, rollingAvg, targetWeightOnDate, todayISO, weekOf } from "@/lib/calc";
import { useStore } from "@/lib/store";
import type { BodyEntry } from "@/lib/types";

type Form = Record<"weight" | "waist" | "chest" | "arm" | "thigh" | "sleep" | "energy" | "kcal" | "protein" | "note", string> & { gym: boolean };
const empty: Form = { weight: "", waist: "", chest: "", arm: "", thigh: "", sleep: "", energy: "", kcal: "", protein: "", note: "", gym: false };
const NUMS = ["weight", "waist", "chest", "arm", "thigh", "sleep", "energy", "kcal", "protein"] as const;

export default function LogPage() {
  const { data, settings: s, upsertBody, deleteBody } = useStore();
  const t = computeTargets(s);
  const [date, setDate] = useState(todayISO());
  const [f, setF] = useState<Form>(empty);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const e = data.body.find((b) => b.date === date);
    if (!e) return setF(empty);
    const nf: Form = { ...empty, note: e.note || "", gym: !!e.gym };
    NUMS.forEach((k) => (nf[k] = e[k] != null ? String(e[k]) : ""));
    setF(nf);
  }, [date, data.body]);

  const set = (k: keyof Form, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  };

  const save = () => {
    const e: BodyEntry = { date, gym: f.gym, note: f.note.trim() || undefined };
    NUMS.forEach((k) => {
      const v = num(f[k]);
      if (v != null) (e as unknown as Record<string, number>)[k] = v;
    });
    if (e.weight != null && (e.weight < 30 || e.weight > 200)) return setMsg("Berat tidak masuk akal — cek kembali.");
    if (e.energy != null && (e.energy < 1 || e.energy > 5)) return setMsg("Energi diisi 1–5.");
    upsertBody(e);
    setMsg(`Tersimpan untuk ${fmtDate(date)}.`);
    setTimeout(() => setMsg(""), 2500);
  };

  const sorted = [...data.body].sort((a, b) => (a.date < b.date ? 1 : -1));
  const weights = [...data.body].filter((b) => b.weight != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  const start = dayNum(s.startDate);
  const lastDay = weights.length ? Math.max(dayNum(weights[weights.length - 1].date), start + 6) : start + 27;
  const days = Array.from({ length: Math.max(1, lastDay - start + 1) }, (_, i) => start + i);
  const isoOf = (d: number) => {
    const x = new Date(d * 86400000);
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
  };

  const nutOk = (b: BodyEntry) =>
    b.kcal == null || b.protein == null ? null : b.protein >= 0.9 * t.protein && Math.abs(b.kcal - t.kcal) <= 0.1 * t.kcal;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Log Harian</h1>
        <p className="muted">Timbang tiap pagi setelah buang air, sebelum makan/minum, pakaian sama. Ukur lingkar 1×/minggu (Senin pagi, setinggi pusar, setelah buang napas). Satu tanggal = satu catatan; menyimpan ulang akan memperbarui.</p>
      </div>

      <section className="card">
        <div className="grid g4">
          <div className="field"><label>Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label>Berat pagi (kg)</label><input inputMode="decimal" value={f.weight} onChange={(e) => set("weight", e.target.value)} placeholder="69,2" /></div>
          <div className="field"><label>Tidur (jam)</label><input inputMode="decimal" value={f.sleep} onChange={(e) => set("sleep", e.target.value)} placeholder="7" /></div>
          <div className="field"><label>Energi (1–5)</label>
            <select value={f.energy} onChange={(e) => set("energy", e.target.value)}>
              <option value="">–</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field"><label>Kalori (estimasi, kkal)</label><input inputMode="numeric" value={f.kcal} onChange={(e) => set("kcal", e.target.value)} placeholder={String(t.kcal)} /></div>
          <div className="field"><label>Protein (g)</label><input inputMode="numeric" value={f.protein} onChange={(e) => set("protein", e.target.value)} placeholder={String(t.protein)} /></div>
          <div className="field" style={{ alignSelf: "end" }}><label className="check"><input type="checkbox" checked={f.gym} onChange={(e) => set("gym", e.target.checked)} /> Gym hari ini</label></div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn ghost sm" type="button" onClick={() => setF((p) => ({ ...p, kcal: String(t.kcal), protein: String(t.protein) }))}>Isi sesuai target (menu dijalankan)</button>
          </div>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary>Lingkar tubuh (mingguan) & catatan</summary>
          <div className="grid g4" style={{ marginTop: 10 }}>
            <div className="field"><label>Pinggang (cm)</label><input inputMode="decimal" value={f.waist} onChange={(e) => set("waist", e.target.value)} /></div>
            <div className="field"><label>Dada (cm)</label><input inputMode="decimal" value={f.chest} onChange={(e) => set("chest", e.target.value)} /></div>
            <div className="field"><label>Lengan (cm)</label><input inputMode="decimal" value={f.arm} onChange={(e) => set("arm", e.target.value)} /></div>
            <div className="field"><label>Paha (cm)</label><input inputMode="decimal" value={f.thigh} onChange={(e) => set("thigh", e.target.value)} /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Catatan progres</label><textarea value={f.note} onChange={(e) => set("note", e.target.value)} /></div>
        </details>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={save}>Simpan</button>
          {msg && <span className="small muted">{msg}</span>}
        </div>
      </section>

      <section className="card">
        <h2>Tren berat badan</h2>
        <Chart
          series={[
            { name: "Target", color: "var(--muted)", dashed: true, points: days.map((d) => ({ x: d - start, y: targetWeightOnDate(s, isoOf(d)) })) },
            { name: "Rata-rata 7 hari", color: "var(--c1)", points: days.map((d) => ({ x: d - start, y: rollingAvg(data.body, isoOf(d)) })) },
            { name: "Timbangan harian", color: "var(--c2)", dots: true, line: false, points: weights.map((b) => ({ x: dayNum(b.date) - start, y: b.weight! })) },
          ]}
          xLabel={(x) => fmtDate(isoOf(start + x)).slice(0, 5)}
          yFmt={(y) => y.toFixed(1)}
        />
        <p className="small muted">Fluktuasi harian 0,5–1 kg normal (air, garam, isi usus). Yang dipakai untuk keputusan adalah rata-rata 7 hari & tren 2–3 minggu.</p>
      </section>

      <section className="card">
        <h2>Riwayat</h2>
        {sorted.length === 0 ? (
          <div className="empty">Belum ada catatan.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th className="r">Mg</th><th className="r">BB</th><th className="r">Rata 7h</th><th className="r">Target</th><th className="r">Pinggang</th><th className="r">Tidur</th><th className="r">Energi</th><th className="r">Kkal</th><th className="r">Protein</th><th>Gym</th><th>Nutrisi</th><th>Catatan</th><th></th></tr></thead>
              <tbody>
                {sorted.map((b) => {
                  const ok = nutOk(b);
                  return (
                    <tr key={b.date}>
                      <td><button className="btn ghost sm" onClick={() => setDate(b.date)}>{fmtDate(b.date)}</button></td>
                      <td className="r">{weekOf(b.date, s.startDate)}</td>
                      <td className="r">{fmt(b.weight)}</td>
                      <td className="r">{fmt(rollingAvg(data.body, b.date), 2)}</td>
                      <td className="r">{fmt(targetWeightOnDate(s, b.date), 2)}</td>
                      <td className="r">{fmt(b.waist)}</td>
                      <td className="r"><span className={b.sleep != null && b.sleep < 6 ? "pill bad" : ""}>{fmt(b.sleep)}</span></td>
                      <td className="r">{b.energy ?? "–"}</td>
                      <td className="r">{b.kcal?.toLocaleString("id-ID") ?? "–"}</td>
                      <td className="r">{b.protein ?? "–"}</td>
                      <td>{b.gym ? "Ya" : "–"}</td>
                      <td>{ok == null ? "–" : <span className={`pill ${ok ? "good" : "warn"}`}>{ok ? "Sesuai" : "Perhatian"}</span>}</td>
                      <td className="small">{b.note}</td>
                      <td><button className="btn danger sm" onClick={() => confirm(`Hapus catatan ${fmtDate(b.date)}?`) && deleteBody(b.date)}>Hapus</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
