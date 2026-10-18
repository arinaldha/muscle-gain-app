# Muscle Gain Planner — 26 Minggu

Aplikasi Next.js untuk menjalankan program muscle gain 6 bulan: target kalori & makro, meal plan 7 hari, daftar belanja & anggaran, program gym Upper/Lower 4×, tracker berat & latihan, weekly review, dan panduan makanan/suplemen. Tanpa MySQL atau database server lain.

## Penyimpanan data (JSON)

| Data | Lokasi | Cara mengubah |
|---|---|---|
| Program (food database, meal plan, latihan, jadwal, panduan) | `data/program.json` | Edit file → commit → Vercel redeploy otomatis |
| Log Anda (berat, latihan, review, pengaturan) | Satu objek JSON di `localStorage` browser | Lewat aplikasi; backup via **Pengaturan → Export JSON** |
| Sinkron antar perangkat (opsional) | Satu file JSON privat `muscle-gain/db.json` di Vercel Blob | Aktifkan di bawah |

Kenapa log tidak ditulis ke file JSON di server: filesystem Vercel bersifat read-only/sementara, jadi tulisan ke file akan hilang. Vercel Blob menyimpan file JSON yang sama secara permanen.

## Deploy ke Vercel

1. Push folder ini ke repo GitHub.
2. Di vercel.com → **Add New → Project** → import repo. Framework terdeteksi Next.js; tidak perlu setting build.
3. **Deploy.** Aplikasi langsung bisa dipakai (data tersimpan di perangkat).

### Aktifkan sinkron (opsional, untuk HP + laptop)

1. Di project Vercel → **Storage → Create → Blob** → hubungkan ke project. Env `BLOB_READ_WRITE_TOKEN` terisi otomatis.
2. **Settings → Environment Variables** → tambah `APP_PASSCODE` (string acak panjang, mis. hasil `openssl rand -hex 24`).
3. **Redeploy.**
4. Di aplikasi: **Pengaturan → Sinkron** → isi passcode → centang *Sinkron otomatis*. Lakukan di setiap perangkat.

Aturan sinkron: perubahan disimpan ±2,5 detik setelah diedit. Jika server sudah diubah dari perangkat lain yang lebih baru, penyimpanan ditolak (409) dan aplikasi meminta Anda **Tarik dari server** dulu, atau **Timpa paksa**.

## Jalankan lokal

```bash
npm install
npm run dev        # http://localhost:3000
# sinkron lokal (opsional): salin .env.example ke .env.local lalu isi
```

## Struktur

```
app/                 halaman (Dashboard, Log, Latihan, Menu & Belanja, Jadwal, Review, Panduan, Pengaturan)
app/api/data/        GET/PUT JSON ke Vercel Blob (dilindungi APP_PASSCODE)
lib/calc.ts          rumus (Mifflin-St Jeor, TDEE berbasis MET, makro, e1RM, double progression, saran kalori)
lib/store.tsx        penyimpanan JSON lokal + sinkron
data/program.json    "database" program
```

Semua angka energi adalah estimasi. Kalibrasi dengan tren berat badan 2–3 minggu di halaman Review.
