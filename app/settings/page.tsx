"use client";

import { useRef, useState } from "react";
import { computeTargets, fmt, todayISO } from "@/lib/calc";
import { program } from "@/lib/program";
import { emptyData, isAppData, useStore } from "@/lib/store";
import type { Settings } from "@/lib/types";

type Field = { key: keyof Settings; label: string; step?: string; type?: "date" | "text" | "time" | "select"; options?: string[]; hint?: string };
const PROFILE: Field[] = [
  { key: "startDate", label: "Tanggal mulai (Senin)", type: "date" },
  { key: "age", label: "Usia (tahun)" },
  { key: "sex", label: "Jenis kelamin", type: "select", options: ["Laki-laki", "Perempuan"] },
  { key: "weightKg", label: "Berat awal (kg)", step: "0.1", hint: "Ganti dengan rata-rata 7 hari minggu 1 bila berbeda" },
  { key: "heightCm", label: "Tinggi (cm)" },
  { key: "waistStartCm", label: "Lingkar pinggang awal (cm)", step: "0.1", hint: "Isi di minggu 1" },
  { key: "dailyBudget", label: "Anggaran makan / hari (Rp)", step: "1000" },
  { key: "bedTime", label: "Jam tidur", type: "time" },
  { key: "wakeTime", label: "Jam bangun", type: "time" },
];
const ENERGY: Field[] = [
  { key: "activityFactor", label: "Faktor aktivitas dasar", step: "0.05", hint: "Kerja duduk = 1,2; olahraga dihitung terpisah" },
  { key: "metGym", label: "MET latihan beban", step: "0.5" },
  { key: "gymMinutes", label: "Durasi gym (menit)" },
  { key: "gymSessionsPerWeek", label: "Sesi gym / minggu" },
  { key: "metCycling", label: "MET bersepeda", step: "0.5" },
  { key: "cyclingMinutesPerGymDay", label: "Menit bersepeda / hari gym" },
  { key: "cyclingDaysPerWeek", label: "Hari bersepeda / minggu" },
  { key: "metFootball", label: "MET sepak bola", step: "0.5" },
  { key: "footballMinutesPerWeek", label: "Menit sepak bola / minggu" },
  { key: "metJogging", label: "MET jogging", step: "0.5" },
  { key: "joggingMinutesPerWeek", label: "Menit jogging / minggu" },
  { key: "surplusKcal", label: "Surplus kalori (kkal)", step: "50" },
  { key: "proteinPerKg", label: "Protein (g/kg)", step: "0.1" },
  { key: "fatPct", label: "Lemak (fraksi kalori, 0,25 = 25%)", step: "0.01" },
  { key: "targetGainPerWeek", label: "Target naik BB (kg/minggu)", step: "0.05" },
  { key: "minGainPerWeek", label: "Batas bawah laju (kg/mg)", step: "0.05" },
  { key: "maxGainPerWeek", label: "Batas atas laju (kg/mg)", step: "0.05" },
];

export default function SettingsPage() {
  const { data, settings: s, updateSettings, replaceAll, sync, setSync, status, pull, push } = useStore();
  const t = computeTargets(s);
  const [pass, setPass] = useState(sync.passcode);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const onChange = (f: Field, v: string) => {
    if (f.type === "date" || f.type === "text" || f.type === "time" || f.type === "select") return updateSettings({ [f.key]: v } as Partial<Settings>);
    if (v === "") return updateSettings({ [f.key]: f.key === "waistStartCm" ? null : program.defaults[f.key] } as Partial<Settings>);
    const n = parseFloat(v.replace(",", "."));
    if (Number.isFinite(n)) updateSettings({ [f.key]: n } as Partial<Settings>);
  };
  const input = (f: Field) => (
    <div className="field" key={f.key}>
      <label>{f.label}</label>
      {f.type === "select" ? (
        <select value={String(s[f.key])} onChange={(e) => onChange(f, e.target.value)}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
      ) : (
        <input type={f.type || "number"} step={f.step} value={s[f.key] == null ? "" : String(s[f.key])} onChange={(e) => onChange(f, e.target.value)} />
      )}
      {f.hint && <div className="small muted" style={{ marginTop: 3 }}>{f.hint}</div>}
    </div>
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `muscle-gain-data-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!isAppData(parsed)) return setMsg("File bukan backup aplikasi ini.");
      if (!confirm(`Ganti semua data dengan backup (${parsed.body.length} log harian, ${parsed.workouts.length} log latihan)?`)) return;
      replaceAll(parsed);
      setMsg("Backup dipulihkan.");
    } catch {
      setMsg("File JSON tidak valid.");
    }
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Pengaturan & Data</h1>
        <p className="muted">Perubahan langsung menghitung ulang target di semua halaman.</p>
      </div>

      <section className="card">
        <h2>Hasil perhitungan saat ini</h2>
        <div className="grid g4">
          <div className="stat"><div className="label">BMI</div><div className="value">{fmt(t.bmi)}</div><div className="sub">{t.bmiLabel}</div></div>
          <div className="stat"><div className="label">BMR / TDEE</div><div className="value">{Math.round(t.bmr)} / {Math.round(t.tdee)}</div><div className="sub">Pemeliharaan {t.tdeeLow}–{t.tdeeHigh} kkal</div></div>
          <div className="stat"><div className="label">Target</div><div className="value">{t.kcal} kkal</div><div className="sub">P {t.protein} · K {t.carbs} · L {t.fat} g</div></div>
          <div className="stat"><div className="label">Aktivitas (kkal/minggu)</div><div className="value">{Math.round(t.gymWeek + t.cyclingWeek + t.extraWeek)}</div><div className="sub">gym {Math.round(t.gymWeek)} · sepeda {Math.round(t.cyclingWeek)} · bola+jog {Math.round(t.extraWeek)}</div></div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>BMR: Mifflin-St Jeor. Aktivitas = (MET − 1) × kg × jam, agar tidak dobel dengan kebutuhan dasar. Semua angka estimasi — kalibrasi dengan tren berat 2–3 minggu.</p>
      </section>

      <section className="card">
        <h2>Profil</h2>
        <div className="grid g3">{PROFILE.map(input)}</div>
      </section>

      <section className="card">
        <details>
          <summary>Asumsi energi & target (lanjutan)</summary>
          <div className="grid g3" style={{ marginTop: 12 }}>{ENERGY.map(input)}</div>
        </details>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost sm" onClick={() => confirm("Kembalikan semua pengaturan ke default program?") && updateSettings(Object.fromEntries(Object.keys(data.settings).map((k) => [k, program.defaults[k as keyof Settings]])) as Partial<Settings>)}>Reset ke default</button>
        </div>
      </section>

      <section className="card">
        <h2>Data (JSON)</h2>
        <p className="small muted">Semua log tersimpan sebagai satu objek JSON di browser ini: {data.body.length} log harian, {data.workouts.length} log latihan, {Object.keys(data.reviews).length} review. Backup rutin disarankan — menghapus data browser akan menghapus log.</p>
        <div className="row">
          <button className="btn" onClick={exportJson}>Export JSON</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <button className="btn danger" onClick={() => confirm("Hapus SEMUA log di perangkat ini? Tidak bisa dibatalkan.") && replaceAll(emptyData())}>Hapus semua data</button>
          {msg && <span className="small muted">{msg}</span>}
        </div>
      </section>

      <section className="card">
        <h2>Sinkron antar perangkat (opsional)</h2>
        <p className="small muted">Menyimpan JSON yang sama sebagai satu file privat di Vercel Blob. Butuh env <code>BLOB_READ_WRITE_TOKEN</code> dan <code>APP_PASSCODE</code> di Vercel (lihat README).</p>
        <div className="grid g3">
          <div className="field"><label>Passcode (APP_PASSCODE)</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" /></div>
          <div className="field" style={{ alignSelf: "end" }}>
            <label className="check"><input type="checkbox" checked={sync.auto} onChange={(e) => setSync({ passcode: pass, auto: e.target.checked })} /> Sinkron otomatis</label>
          </div>
          <div className="field" style={{ alignSelf: "end" }}><button className="btn ghost" onClick={() => setSync({ passcode: pass, auto: sync.auto })}>Simpan passcode</button></div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => void pull()} disabled={!sync.passcode}>Tarik dari server</button>
          <button className="btn ghost" onClick={() => void push()} disabled={!sync.passcode}>Simpan ke server</button>
          {status.state === "conflict" && <button className="btn danger" onClick={() => confirm("Timpa data server dengan data perangkat ini?") && void push(true)}>Timpa paksa</button>}
        </div>
        {status.message && (
          <div className={`note ${status.state === "error" || status.state === "conflict" ? "bad" : status.state === "ok" ? "good" : ""}`} style={{ marginTop: 10 }}>
            {status.message}
          </div>
        )}
      </section>
    </div>
  );
}
