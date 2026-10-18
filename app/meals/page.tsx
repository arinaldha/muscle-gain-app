"use client";

import { useState } from "react";
import { computeTargets, fmt, fmtRp, itemNutrition, shoppingList, sumNutrition } from "@/lib/calc";
import { DAYS, foodMap, program } from "@/lib/program";
import { useStore } from "@/lib/store";

export default function MealsPage() {
  const { settings: s } = useStore();
  const t = computeTargets(s);
  const [day, setDay] = useState<string>(DAYS[0]);
  const [tab, setTab] = useState<"menu" | "shop" | "foods">("menu");
  const meals = program.mealPlan[day] || [];
  const totals = DAYS.map((d) => ({ day: d, ...sumNutrition(program.mealPlan[d] || []) }));
  const avg = (k: "kcal" | "protein" | "carbs" | "fat" | "cost" | "fiber") => totals.reduce((a, x) => a + x[k], 0) / totals.length;
  const shop = shoppingList();
  const weekCost = shop.reduce((a, x) => a + x.cost, 0);
  const pctTone = (v: number) => (Math.abs(v - 1) <= 0.05 ? "good" : "warn");

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Menu & Belanja</h1>
        <p className="muted">Berat sesuai kondisi bahan: nasi = matang; ayam/ikan/tempe/tahu = mentah. Gizi & biaya dihitung dari food database. Harga = estimasi Jabodetabek Okt 2026.</p>
      </div>

      <div className="tabs">
        {(["menu", "shop", "foods"] as const).map((k) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{k === "menu" ? "Meal plan 7 hari" : k === "shop" ? "Daftar belanja & anggaran" : "Food database"}</button>
        ))}
      </div>

      {tab === "menu" && (
        <>
          <section className="card">
            <h2>Ringkasan harian vs target</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Hari</th><th className="r">Kalori</th><th className="r">Protein</th><th className="r">Karbo</th><th className="r">Lemak</th><th className="r">Serat</th><th className="r">Biaya</th><th className="r">Kkal vs target</th><th className="r">Protein vs target</th></tr></thead>
                <tbody>
                  <tr><td className="muted">Target</td><td className="r muted">{t.kcal}</td><td className="r muted">{t.protein}</td><td className="r muted">{t.carbs}</td><td className="r muted">{t.fat}</td><td className="r muted">{t.fiber}</td><td className="r muted">{fmtRp(s.dailyBudget)}</td><td /><td /></tr>
                  {totals.map((x) => (
                    <tr key={x.day} onClick={() => setDay(x.day)} style={{ cursor: "pointer" }}>
                      <td><b>{x.day}</b></td><td className="r">{Math.round(x.kcal)}</td><td className="r">{Math.round(x.protein)}</td><td className="r">{Math.round(x.carbs)}</td><td className="r">{Math.round(x.fat)}</td><td className="r">{Math.round(x.fiber)}</td>
                      <td className="r"><span className={`pill ${x.cost <= s.dailyBudget ? "good" : "bad"}`}>{fmtRp(x.cost)}</span></td>
                      <td className="r"><span className={`pill ${pctTone(x.kcal / t.kcal)}`}>{Math.round((x.kcal / t.kcal) * 100)}%</span></td>
                      <td className="r"><span className={`pill ${x.protein >= t.protein ? "good" : "warn"}`}>{Math.round((x.protein / t.protein) * 100)}%</span></td>
                    </tr>
                  ))}
                  <tr className="total"><td>Rata-rata</td><td className="r">{Math.round(avg("kcal"))}</td><td className="r">{Math.round(avg("protein"))}</td><td className="r">{Math.round(avg("carbs"))}</td><td className="r">{Math.round(avg("fat"))}</td><td className="r">{Math.round(avg("fiber"))}</td><td className="r">{fmtRp(avg("cost"))}</td><td /><td /></tr>
                </tbody>
              </table>
            </div>
            {Math.abs(avg("kcal") / t.kcal - 1) > 0.05 && (
              <div className="note warn" style={{ marginTop: 10 }}>Target kalori Anda ({t.kcal}) sudah berubah &gt;5% dari menu (±{Math.round(avg("kcal"))}). Sesuaikan porsi nasi: ±40 g nasi matang ≈ 70 kkal.</div>
            )}
            <p className="small muted" style={{ marginTop: 8 }}>Pola 3× makan tetap jadi inti. Pisang pra-gym & camilan kantor tidak perlu dimasak; bila ingin tetap 3×, gabungkan pisang ke Makan 1 dan kacang ke Makan 2 — total harian sama.</p>
          </section>

          <div className="tabs">
            {DAYS.map((d) => <button key={d} className={`tab ${d === day ? "active" : ""}`} onClick={() => setDay(d)}>{d}</button>)}
          </div>

          <section className="stack">
            {meals.map((m) => {
              const tot = sumNutrition([m]);
              return (
                <div className="card" key={m.time + m.slot}>
                  <div className="ex-head">
                    <h2 style={{ margin: 0 }}>{m.time} · {m.slot}</h2>
                    <span className="small muted">{Math.round(tot.kcal)} kkal · P {Math.round(tot.protein)} g · K {Math.round(tot.carbs)} g · L {Math.round(tot.fat)} g · {fmtRp(tot.cost)}</span>
                  </div>
                  <p style={{ margin: "4px 0 10px" }}><b>{m.menu}</b></p>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Bahan</th><th className="r">Berat</th><th>Kondisi</th><th>Porsi rumah tangga</th><th className="r">Kkal</th><th className="r">P</th><th className="r">K</th><th className="r">L</th><th className="r">Biaya</th></tr></thead>
                      <tbody>
                        {m.items.map((it) => {
                          const n = itemNutrition(it.food, it.grams);
                          const f = foodMap[it.food];
                          return (
                            <tr key={it.food}>
                              <td>{it.food}</td><td className="r">{it.grams} g</td><td className="small">{f?.condition}</td><td className="small muted">{f?.householdPortion}</td>
                              <td className="r">{Math.round(n.kcal)}</td><td className="r">{fmt(n.protein)}</td><td className="r">{fmt(n.carbs)}</td><td className="r">{fmt(n.fat)}</td><td className="r">{fmtRp(n.cost)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {m.alternative && <p className="small" style={{ marginTop: 8 }}><b>Alternatif setara:</b> {m.alternative}</p>}
                </div>
              );
            })}
          </section>
        </>
      )}

      {tab === "shop" && (
        <section className="card">
          <div className="grid g4" style={{ marginBottom: 14 }}>
            <div className="stat"><div className="label">Biaya / minggu</div><div className="value">{fmtRp(weekCost)}</div></div>
            <div className="stat"><div className="label">Rata-rata / hari</div><div className="value">{fmtRp(weekCost / 7)}</div></div>
            <div className="stat"><div className="label">Anggaran / minggu</div><div className="value">{fmtRp(s.dailyBudget * 7)}</div></div>
            <div className="stat"><div className="label">Sisa</div><div className="value" style={{ color: s.dailyBudget * 7 - weekCost >= 0 ? "var(--good)" : "var(--bad)" }}>{fmtRp(s.dailyBudget * 7 - weekCost)}</div></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bahan</th><th>Kategori</th><th className="r">Butuh (g dimakan)</th><th className="r">Beli kotor (g)</th><th className="r">Jumlah</th><th>Satuan</th><th className="r">Biaya</th><th>Simpan & persiapan</th></tr></thead>
              <tbody>
                {shop.map((x) => (
                  <tr key={x.name}>
                    <td>{x.name}</td><td>{x.category}</td><td className="r">{Math.round(x.grams).toLocaleString("id-ID")}</td><td className="r">{Math.round(x.buyGrams).toLocaleString("id-ID")}</td>
                    <td className="r">{fmt(Math.ceil(x.units * 10) / 10)}</td><td className="small">{x.unit}</td><td className="r">{fmtRp(x.cost)}</td><td className="small">{x.note}</td>
                  </tr>
                ))}
                <tr className="total"><td colSpan={6}>Total pemakaian 1 minggu</td><td className="r">{fmtRp(weekCost)}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>Biaya = pemakaian aktual (gram × harga per 100 g). Belanja nyata bisa sedikit lebih tinggi karena kemasan (mis. minyak 1 L dipakai beberapa minggu). Suplemen tidak termasuk. Saran: belanja Sabtu pagi + tambahan protein/sayur segar Rabu.</p>
        </section>
      )}

      {tab === "foods" && (
        <section className="card">
          <p className="small muted">Nilai per 100 g bagian yang dimakan, sesuai kolom kondisi. Ubah data di <code>data/program.json</code> lalu redeploy.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bahan</th><th>Kondisi</th><th className="r">Kkal</th><th className="r">P</th><th className="r">K</th><th className="r">L</th><th className="r">Serat</th><th>Harga beli</th><th className="r">% dimakan</th><th>Sumber</th></tr></thead>
              <tbody>
                {program.foods.map((f) => (
                  <tr key={f.name}>
                    <td>{f.name}</td><td className="small">{f.condition}</td><td className="r">{f.kcal}</td><td className="r">{f.protein}</td><td className="r">{f.carbs}</td><td className="r">{f.fat}</td><td className="r">{f.fiber}</td>
                    <td className="small">{fmtRp(f.buyPrice)} / {f.buyUnit}</td><td className="r">{Math.round(f.ediblePct * 100)}%</td><td className="small muted">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
