# Product Requirements Document (PRD)
**Produk:** CRM + Kanban Internal
**Versi:** 1.0 · **Tanggal:** 31 Oktober 2026 · **Referensi:** [BRD.md](BRD.md)

---

## 1. Visi Produk
> Satu tempat bagi seluruh tim untuk mengenal pelanggan, menggerakkan deal, dan menyelesaikan pekerjaan — sesederhana menggeser kartu.

**Prinsip produk**
1. **Kanban-first** — pekerjaan dan penjualan divisualisasikan sebagai kartu yang bisa digeser.
2. **Cepat dicatat** — menambah kontak/deal/tugas maksimal 3 klik.
3. **Satu sumber kebenaran** — tidak ada data penting di luar sistem.
4. **Jelas siapa mengerjakan apa** — setiap deal & tugas punya pemilik dan tenggat.

## 2. Persona
| Persona | Profil | Kebutuhan | Frustrasi saat ini |
|---------|--------|-----------|--------------------|
| **Rina — Sales Manager** | Memimpin 6 sales, laporan ke direktur | Lihat pipeline & kinerja tim kapan saja, bagi lead | Rekap manual tiap Jumat, data tidak sinkron |
| **Budi — Sales** | Menangani 40–80 lead aktif | Tahu siapa yang harus di-follow-up hari ini, riwayat percakapan | Lupa follow-up, catatan tercecer di WA |
| **Sari — Staff Ops/Marketing** | Mengerjakan tugas lintas tim | Daftar tugas jelas, deadline, prioritas | Tugas datang dari chat, mudah tenggelam |
| **Pak Andi — Owner (Admin)** | Pengambil keputusan | Ringkasan pendapatan potensial & kontrol akses | Tidak punya visibilitas real-time |

## 3. Daftar Fitur & Prioritas (MoSCoW)
| Kode | Fitur | Prioritas | BR |
|------|-------|-----------|----|
| F1 | Autentikasi & manajemen pengguna/peran | Must | BR-07 |
| F2 | Kontak (CRUD, tag, owner, pencarian, filter) | Must | BR-01 |
| F3 | Perusahaan (CRUD, relasi kontak & deal) | Must | BR-01 |
| F4 | Pipeline Deal Kanban (drag & drop, Won/Lost, total nilai per tahap) | Must | BR-02 |
| F5 | Task Board Kanban (board, kolom, tugas, checklist, komentar) | Must | BR-04 |
| F6 | Aktivitas & catatan (timeline, log otomatis) | Must | BR-05 |
| F7 | Tugas follow-up terkait kontak/deal + tampilan "Tugas Saya" | Must | BR-03 |
| F8 | Dashboard ringkasan | Must | BR-06 |
| F9 | Notifikasi in-app (assign, mention, jatuh tempo) | Should | BR-03 |
| F10 | Import/Export CSV | Should | BR-08 |
| F11 | Pengaturan tahap pipeline & template board | Should | BR-09 |
| F12 | Pencarian global (Ctrl+K) | Should | BR-01 |
| F13 | Tampilan list/tabel sebagai alternatif Kanban | Could | BR-02 |
| F14 | Integrasi WhatsApp & Email | Won't (MVP) → Fase 2 | BR-10 |
| F15 | Otomasi workflow | Won't (MVP) → Fase 2 | — |

## 4. User Stories & Acceptance Criteria

### Autentikasi & Pengguna
**US-01** — Sebagai pengguna, saya ingin login dengan email & password agar dapat mengakses data sesuai peran saya. *(F1, BR-07)*
- Given akun aktif, When saya memasukkan kredensial benar, Then saya diarahkan ke Dashboard.
- Given kredensial salah 5x dalam 15 menit, Then login dikunci sementara.

**US-02** — Sebagai Admin, saya ingin mengundang pengguna dan menetapkan peran agar akses terkontrol. *(F1, BR-07)*
- Given saya Admin, When saya mengundang email dengan peran tertentu, Then pengguna menerima tautan aktivasi.
- Given pengguna dinonaktifkan, Then ia tidak bisa login, tetapi datanya tetap ada.

### Kontak & Perusahaan
**US-03** — Sebagai Sales, saya ingin menambah kontak baru dengan cepat agar lead tidak hilang. *(F2, BR-01)*
- Given form kontak, When saya mengisi minimal nama dan (email atau telepon), Then kontak tersimpan dengan saya sebagai owner.
- Given email/telepon sudah ada, Then sistem memperingatkan kemungkinan duplikat.

**US-04** — Sebagai Sales, saya ingin menghubungkan kontak ke perusahaan agar terlihat siapa saja di satu organisasi. *(F3, BR-01)*
- Given halaman perusahaan, Then terlihat daftar kontak, deal, dan aktivitasnya.

**US-05** — Sebagai pengguna, saya ingin mencari & memfilter kontak (tag, owner, status, tanggal) agar cepat menemukan data. *(F2, F12, BR-01)*
- Hasil pencarian tampil < 1 detik untuk 50.000 data.

**US-06** — Sebagai Manager, saya ingin mengimpor kontak dari CSV agar data spreadsheet lama pindah. *(F10, BR-08)*
- Given file CSV, When saya memetakan kolom, Then saya melihat preview, baris error, dan duplikat sebelum menyimpan.

**US-07** — Sebagai Manager, saya ingin mengekspor kontak/deal ke CSV sesuai filter. *(F10, BR-08)*

**US-08** — Sebagai Sales, saya ingin mencatat aktivitas (telepon, meeting, catatan) pada kontak/deal agar riwayat terdokumentasi. *(F6, BR-05)*
- Aktivitas tampil di timeline terbaru di atas, dengan penulis & waktu.
- Perubahan penting (tahap deal, owner) tercatat otomatis.

### Pipeline Deal (Kanban)
**US-09** — Sebagai Sales, saya ingin membuat deal (judul, nilai, kontak/perusahaan, perkiraan closing) agar peluang terlacak. *(F4, BR-02)*

**US-10** — Sebagai Sales, saya ingin menggeser kartu deal antar tahap agar status selalu terkini. *(F4, BR-02)*
- Given board pipeline, When saya drag kartu ke tahap lain, Then posisi tersimpan, total nilai kolom ter-update, dan histori tahap tercatat.

**US-11** — Sebagai Sales, saya ingin menandai deal Won/Lost; jika Lost wajib mengisi alasan. *(F4, BR-02, BR-06)*

**US-12** — Sebagai Admin/Manager, saya ingin mengatur tahap pipeline (nama, urutan, probabilitas) tanpa bantuan developer. *(F11, BR-09)*

### Task Board (Kanban)
**US-13** — Sebagai Manager, saya ingin membuat board dengan kolom kustom (mis. To Do, In Progress, Review, Done). *(F5, F11, BR-04, BR-09)*

**US-14** — Sebagai pengguna, saya ingin membuat tugas dengan assignee, deadline, prioritas, label, dan checklist. *(F5, BR-04)*

**US-15** — Sebagai pengguna, saya ingin menggeser tugas antar kolom & mengurutkannya. *(F5, BR-04)*
- Kartu di kolom yang ditandai "selesai" otomatis berstatus completed.

**US-16** — Sebagai pengguna, saya ingin berkomentar dan me-mention rekan pada tugas. *(F5, F9, BR-04)*

**US-17** — Sebagai Sales, saya ingin membuat tugas follow-up yang terhubung ke kontak/deal agar tidak lupa. *(F7, BR-03)*

**US-18** — Sebagai pengguna, saya ingin halaman "Tugas Saya" (terlambat, hari ini, minggu ini). *(F7, BR-03)*

**US-19** — Sebagai pengguna, saya ingin notifikasi saat di-assign, di-mention, atau tugas jatuh tempo. *(F9, BR-03)*

### Dashboard
**US-20** — Sebagai Manager/Admin, saya ingin dashboard berisi nilai pipeline per tahap, deal won bulan ini, win rate, dan tugas terlambat per orang. *(F8, BR-06)*
- Semua pengguna melihat angka pipeline tim; tabel kinerja per orang hanya untuk Manager/Admin.

## 5. Alur Pengguna Utama
**Alur penjualan**
```
Lead masuk → Tambah Kontak (+Perusahaan) → Buat Deal di tahap "Lead"
  → Catat aktivitas & buat tugas follow-up → Geser deal: Qualified → Proposal → Negotiation
  → Won (nilai masuk dashboard)  /  Lost (isi alasan)
```

**Alur tugas tim**
```
Manager buat Board → Buat tugas + assignee + deadline → Assignee dapat notifikasi
  → Geser ke In Progress → Komentar/checklist → Geser ke Done
```

## 6. Kebutuhan Non-Fungsional (ringkas)
- Halaman utama termuat < 2 detik; drag & drop terasa instan (optimistic update).
- Responsif di desktop, tablet, dan ponsel.
- Ketersediaan ≥ 99,5% di jam kerja; backup harian.
- Detail teknis: lihat [TRD.md](TRD.md).

## 7. Metrik Produk
| Metrik | Cara ukur |
|--------|-----------|
| Weekly Active Users | Login unik per minggu |
| Deal tercatat per sales per minggu | Jumlah deal baru |
| Waktu ke aktivitas pertama | Selisih `contact.createdAt` → aktivitas pertama |
| Win rate | Won / (Won + Lost) per periode |
| Tugas tepat waktu | Tugas selesai ≤ due date / total tugas selesai |

## 8. Roadmap
| Fase | Durasi | Cakupan |
|------|--------|---------|
| **MVP (v1.0)** | Minggu 1–10 | F1–F12 |
| **v1.1** | +4 minggu | Tampilan tabel (F13), filter tersimpan, laporan sederhana per sales |
| **Fase 2** | +8 minggu | Integrasi WhatsApp & Email (log otomatis, kirim dari CRM), otomasi (auto-assign, auto-move, reminder), laporan lanjutan, custom field |

### Milestone MVP
| Minggu | Deliverable |
|--------|-------------|
| 1–2 | Setup proyek, auth, user & role, layout dasar |
| 3–4 | Kontak, Perusahaan, aktivitas, pencarian |
| 5–6 | Pipeline Deal Kanban + pengaturan tahap |
| 7–8 | Task Board Kanban, Tugas Saya, notifikasi |
| 9 | Dashboard, import/export CSV |
| 10 | QA, UAT, migrasi data, go-live |

## 9. Keputusan (31 Okt 2026)
1. **Pipeline:** hanya satu pipeline penjualan.
2. **Visibilitas deal:** semua deal tim tampil di satu board pipeline bersama; semua pengguna boleh menggeser & mengubah deal siapa pun (hapus deal dan ganti owner tetap Admin/Manager).
3. **Login:** hanya email & password, tanpa login Google.
