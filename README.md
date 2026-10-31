# CRM + Kanban (Internal)

Aplikasi CRM dengan Pipeline Deal dan Task Board berbasis Kanban untuk tim internal.
Dokumen perencanaan ada di [docs/](docs/README.md).

**Stack:** Next.js 16 (App Router) · Prisma 7 + PostgreSQL · Auth.js v5 · Tailwind CSS v4 · dnd-kit

## Menjalankan di komputer lokal

Butuh Node.js 20+. Docker tidak diperlukan.

```bash
npm install

# 1. Jalankan Postgres lokal (biarkan berjalan di terminal terpisah,
#    atau tambahkan --detach agar berjalan di background)
npm run db:local

# 2. Salin .env.example ke .env lalu isi DATABASE_URL dengan URL "TCP"
#    yang ditampilkan langkah 1, dan AUTH_SECRET (npx auth secret)

# 3. Buat tabel & isi data contoh
npm run db:migrate
npm run db:seed

# 4. Jalankan aplikasi
npm run dev
```

Buka http://localhost:3000 dan login:

| Email | Peran | Password |
|-------|-------|----------|
| admin@crm.local | Admin | password123 |
| rina@crm.local | Manager | password123 |
| budi@crm.local | Member (Sales) | password123 |
| sari@crm.local | Member (Staff) | password123 |

> Ganti semua password ini sebelum dipakai sungguhan.

## Deploy ke VPS & GitHub

Panduan langkah demi langkah (install, GitHub, VPS Ubuntu, domain + HTTPS, deploy otomatis GitHub Actions, backup):
- Laptop Windows: [docs/DEPLOY.md](docs/DEPLOY.md) · PDF: [docs/Panduan-Instalasi-Deploy.pdf](docs/Panduan-Instalasi-Deploy.pdf)
- Mac: [docs/DEPLOY-macOS.md](docs/DEPLOY-macOS.md) · PDF: [docs/Panduan-Instalasi-Deploy-macOS.pdf](docs/Panduan-Instalasi-Deploy-macOS.pdf)

Script bantu: `scripts/deploy.sh` (update aplikasi di VPS), `scripts/create-user.mjs` (buat pengguna),
`scripts/set-password.mjs` (ganti password).

## Perintah

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Server development |
| `npm run build` / `npm start` | Build & jalankan versi produksi |
| `npm run typecheck` / `npm run lint` | Pemeriksaan kode |
| `npm run db:migrate` | Terapkan perubahan `prisma/schema.prisma` |
| `npm run db:seed` | Isi data contoh (hanya jika database kosong) |
| `npm run db:studio` | Lihat isi database di browser |

## Struktur

```
prisma/              skema, migrasi, seed
src/app/(auth)/      halaman login
src/app/(app)/       halaman utama (dashboard, kontak, pipeline, board, …)
src/components/      UI dasar + komponen Kanban generik
src/server/          auth, hak akses, service (aturan bisnis), server actions
src/lib/             format Rupiah/tanggal, posisi kartu, nomor telepon
```

Aturan penting: halaman & komponen tidak memanggil database untuk mengubah data secara langsung.
Semua perubahan lewat `src/server/actions` → `src/server/services`, dan hak akses dicek di service.

## Status fitur

**Sudah jalan:** login & proteksi halaman, hak akses per peran, daftar/tambah/detail kontak
(cek duplikat, timeline, catat aktivitas), daftar perusahaan, Pipeline Kanban (drag & drop, tambah deal,
Won/Lost dengan alasan wajib, histori, notifikasi ke owner, penanda deal macet, filter "Deal saya"),
Task Board Kanban (buat board dari template, tambah cepat, drag & drop, WIP limit, kolom Done),
Tugas Saya, Dashboard, Pengaturan (baca saja).

**Drawer detail deal** (klik kartu atau buka `/deals?deal=<id>`): edit semua field dengan pengecekan
bentrok edit, ganti owner (Admin/Manager) + notifikasi, Won/Lost/buka kembali, hapus (Admin/Manager),
catat aktivitas, timeline & histori tahap, buat tugas follow-up ke board "Follow-up Sales".

**Modal detail tugas** (klik kartu atau `/boards/<id>?task=<id>`): edit judul/deskripsi/prioritas/jatuh tempo,
pindah kolom, assignee + notifikasi, checklist dengan progres, komentar dengan @mention + notifikasi,
arsip & hapus.

**Berikutnya (lihat docs/PRD.md roadmap):** lonceng notifikasi (datanya sudah tercatat), edit/hapus kontak
& perusahaan, pencarian global Ctrl+K, import/export CSV, form Pengaturan, undang pengguna & reset password,
rate limit login, tes otomatis (Vitest/Playwright).
