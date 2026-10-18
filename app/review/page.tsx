"use client";

import { fmt, fmtDate, todayISO, weekOf, weeklyStats } from "@/lib/calc";
import { LIFTS } from "@/lib/program";
import { useStore } from "@/lib/store";

const DECISIONS = ["", "Pertahankan", "Naikkan 100–150 kkal", "Turunkan 100–150 kkal", "Deload", "Kurangi 1 set/otot", "Tambah 1 set/otot", "Lainnya"];

export default function ReviewPage() {
  const { data, settings: s, setReview } = useStore();
  const rows = weeklyStats(data, s);
  const current = weekOf(todayISO(), s.startDate);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Weekly Review</h1>
        <p className="muted">Isi tiap Minggu malam (±10 menit). Angka terisi otomatis dari log; Anda cukup menulis kendala & keputusan. Putuskan berdasarkan tren 2–3 minggu.</p>
      </div>

      <div className="note">
        <b>Aturan kalori:</b> laju 2 minggu &lt; {s.minGainPerWeek} kg/mg selama 2–3 minggu → +100–150 kkal (±40 g nasi atau 1 genggam kacang). &gt; {s.maxGainPerWeek} kg/mg → −100–150 kkal. Pinggang naik &gt;1 cm dalam 4 minggu sementara beban tidak naik → turunkan 100–150 kkal.
        <br /><b>Aturan latihan:</b> performa turun 2 minggu beruntun di ≥2 latihan + tidur/energi buruk → deload lebih awal.
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mg</th><th>Periode</th><th>Fase</th><th className="r">Target</th><th className="r">Aktual</th><th className="r">Δ</th><th className="r">Laju 2mg</th><th className="r">Pinggang</th>
                <th className="r">Kkal</th><th className="r">Protein</th><th className="r">Gym</th><th className="r">Tidur</th><th className="r">≥7j</th>
                {LIFTS.map((l) => <th key={l} className="r">{l.split(" ")[0] === "Barbell" ? "Bench" : l.split(" ")[0] === "Back" ? "Squat" : l.split(" ")[0] === "Trap" ? "DL" : "Pulldown"}</th>)}
                <th>Saran otomatis</th><th style={{ minWidth: 160 }}>Kendala</th><th style={{ minWidth: 170 }}>Keputusan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rv = data.reviews[r.week] || {};
                const inBand = r.avgWeight != null && r.avgWeight >= s.weightKg + s.minGainPerWeek * r.week && r.avgWeight <= s.weightKg + s.maxGainPerWeek * r.week;
                const gymPct = r.planned ? r.gymDone / r.planned : 0;
                const started = r.start <= todayISO();
                return (
                  <tr key={r.week} style={r.week === current ? { outline: "2px solid var(--brand)", outlineOffset: -2 } : undefined}>
                    <td><b>{r.week}</b></td>
                    <td className="small">{fmtDate(r.start)}–{fmtDate(r.end).slice(0, 5)}</td>
                    <td className="small"><span className={/Deload/.test(r.phase) ? "pill info" : ""}>{r.phase}</span></td>
                    <td className="r">{fmt(r.target, 2)}</td>
                    <td className="r">{r.avgWeight == null ? "–" : <span className={`pill ${inBand ? "good" : "warn"}`}>{fmt(r.avgWeight, 2)}</span>}</td>
                    <td className="r">{fmt(r.delta, 2)}</td>
                    <td className="r">{fmt(r.rate2, 2)}</td>
                    <td className="r">{fmt(r.waist)}</td>
                    <td className="r">{r.kcal == null ? "–" : Math.round(r.kcal)}</td>
                    <td className="r">{r.protein == null ? "–" : Math.round(r.protein)}</td>
                    <td className="r">
                      {started ? <span className={`pill ${gymPct >= 0.75 ? "good" : "bad"}`}>{r.gymDone}/</span> : `${r.gymDone}/`}
                      <input style={{ width: 46, minHeight: 30, padding: "2px 4px", display: "inline-block" }} inputMode="numeric" aria-label="Sesi direncanakan"
                        value={rv.planned ?? s.gymSessionsPerWeek} onChange={(e) => setReview(r.week, { planned: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="r">{fmt(r.sleep)}</td>
                    <td className="r">{r.nights7}</td>
                    {LIFTS.map((l) => <td key={l} className="r">{fmt(r.lifts[l])}</td>)}
                    <td className="small">{r.suggestion && <span className={`pill ${/naikkan|turunkan/i.test(r.suggestion) ? "warn" : "good"}`}>{r.suggestion}</span>}</td>
                    <td><input value={rv.obstacle ?? ""} onChange={(e) => setReview(r.week, { obstacle: e.target.value })} placeholder="mis. deadline tesis" /></td>
                    <td>
                      <select value={rv.decision ?? ""} onChange={(e) => setReview(r.week, { decision: e.target.value })}>
                        {DECISIONS.map((d) => <option key={d} value={d}>{d || "–"}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
