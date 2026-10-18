"use client";

import { program } from "@/lib/program";

const toneOf = (g: string) => (g.startsWith("Prioritas") ? "good" : g.includes("dibatasi") ? "warn" : g.startsWith("Waspadai") ? "bad" : "info");

export default function GuidePage() {
  const groups = Array.from(new Set(program.foodGuide.map((g) => g.group)));
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Panduan</h1>
        <p className="muted">Muscle gain tidak mengharuskan menghindari makanan favorit. Yang penting total kalori, protein, dan kualitas mayoritas makanan (±80–90%).</p>
      </div>

      <section className="card">
        <h2>Panduan makanan</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kelompok</th><th>Makanan</th><th>Alasan</th><th>Contoh porsi</th><th>Frekuensi</th></tr></thead>
            <tbody>
              {groups.flatMap((g) =>
                program.foodGuide.filter((x) => x.group === g).map((x, i) => (
                  <tr key={g + x.food}>
                    <td>{i === 0 && <span className={`pill ${toneOf(g)}`}>{g}</span>}</td>
                    <td><b>{x.food}</b></td><td className="small">{x.reason}</td><td className="small">{x.portion}</td><td className="small">{x.frequency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Suplemen — opsional, bukan keharusan</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Suplemen</th><th>Bukti manfaat</th><th>Siapa yang mungkin perlu</th><th>Dosis umum</th><th>Keterbatasan / keamanan</th><th>Biaya (estimasi)</th></tr></thead>
            <tbody>{program.supplements.map((x) => <tr key={x.name}><td><b>{x.name}</b></td><td className="small">{x.evidence}</td><td className="small">{x.who}</td><td className="small">{x.dose}</td><td className="small">{x.limits}</td><td className="small">{x.cost}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="grid g2">
        <div className="card">
          <h2>Timing makan sekitar gym 05:20</h2>
          <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
            <li>Pra-gym 04:40: karbo ringan (pisang/roti) + air. Latihan tanpa makan tetap boleh bila perut tak nyaman.</li>
            <li>Pasca-gym 07:00: makan utama ≥30 g protein + karbo. Jendela "anabolik" tidak sesempit 30 menit — total & distribusi protein harian yang utama.</li>
            <li>Tidak sempat sarapan: susu UHT 250 ml + 2 roti + 2 telur rebus dari minimarket (≈25 g protein).</li>
            <li>Hidrasi ±2,4 L dasar + 0,5–1 L di hari gym/bersepeda/sepak bola. Urin kuning pucat = cukup.</li>
            <li>Kafein hanya pagi; waktu paruh ±5 jam mengganggu tidur 21:30.</li>
          </ul>
        </div>
        <div className="card">
          <h2>Cara mengukur</h2>
          <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
            <li><b>Berat:</b> tiap pagi, setelah buang air, sebelum makan, pakaian sama. Pakai rata-rata 7 hari.</li>
            <li><b>Pinggang:</b> 1×/minggu, setinggi pusar, setelah buang napas normal, pita tidak menekan.</li>
            <li><b>Foto:</b> hari pertama tiap bulan; cahaya, jarak, pose sama (depan, samping, belakang).</li>
            <li><b>Latihan:</b> catat beban, reps tiap set, dan RIR set 1 di setiap sesi.</li>
            <li><b>Nutrisi:</b> catat estimasi kalori & protein harian; "Sesuai" = ±10% kalori dan ≥90% protein.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Sumber ilmiah utama</h2>
        <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>
          {program.sources.map((x) => <li key={x}>{x}</li>)}
        </ol>
      </section>
    </div>
  );
}
