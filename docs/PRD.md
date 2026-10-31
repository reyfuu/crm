# Product Requirements Document (PRD)
**Produk:** CRM + Kanban Internal
**Versi:** 1.1 · **Tanggal:** 31 Oktober 2026 · **Referensi:** [BRD.md](BRD.md)
**Revisi 1.1:** F1 diperjelas menjadi kelola pengguna lengkap; US-02 diubah, ditambah US-21..US-24; lupa password direset oleh Admin; hak akses per pengguna (F16).

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
| F1 | Autentikasi & kelola pengguna (daftar, tambah, ubah, nonaktifkan, hapus, reset password) | Must | BR-07, BR-11 |
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
| F16 | Manajemen hak akses per pengguna (default dari peran, pengecualian per orang) | Must | BR-12 |

## 4. User Stories & Acceptance Criteria

### Autentikasi & Pengguna
**US-01** — Sebagai pengguna, saya ingin login dengan email & password agar dapat mengakses data sesuai peran saya. *(F1, BR-07)*
- Given akun aktif, When saya memasukkan kredensial benar, Then saya diarahkan ke Dashboard.
- Given kredensial salah 5x dalam 15 menit, Then login dikunci sementara.

**US-02** — Sebagai Admin, saya ingin menambah pengguna baru dengan peran tertentu agar anggota tim bisa mulai bekerja. *(F1, BR-07, BR-11)*
- Given saya Admin, When saya mengisi nama, email, peran, dan password awal (boleh dibuat acak), Then akun aktif dan data loginnya tampil sekali untuk saya salin dan bagikan.
- Given email sudah dipakai pengguna lain, When saya menyimpan, Then sistem menolak dengan pesan yang jelas.
- Given saya Manager atau Member, Then menu dan halaman Pengguna tidak tersedia untuk saya.
- *Catatan:* undangan lewat email (tautan aktivasi) menyusul setelah SMTP tersedia.

**US-21** — Sebagai Admin, saya ingin mencari, mengubah data & peran, serta menonaktifkan pengguna agar akses selalu sesuai kondisi tim. *(F1, BR-11)*
- Given daftar pengguna, When saya mencari nama/email atau memfilter peran/status, Then hanya pengguna yang cocok yang tampil, beserta waktu login terakhirnya.
- Given saya menonaktifkan pengguna yang sedang login, When ia membuka halaman berikutnya, Then ia langsung keluar dan melihat pesan bahwa akunnya dinonaktifkan; data miliknya tetap ada.
- Given saya mengubah peran seseorang, Then hak aksesnya berubah pada permintaan berikutnya tanpa perlu login ulang.
- Given saya mengubah akun sendiri, Then saya tidak dapat mengubah peran atau menonaktifkan diri sendiri.
- Given hanya tersisa satu Admin aktif, Then ia tidak dapat diturunkan perannya atau dinonaktifkan.

**US-22** — Sebagai Admin, saya ingin mengatur ulang password pengguna yang lupa agar ia bisa masuk lagi. *(F1, BR-11)*
- Given saya lupa password, When saya menekan "Lupa kata sandi?" di halaman login, Then muncul petunjuk untuk menghubungi Admin.
- Given saya Admin, When saya mengisi password baru untuk pengguna, Then password lama langsung tidak berlaku dan password baru tampil sekali untuk dibagikan.

**US-23** — Sebagai Admin, saya ingin menghapus akun yang salah dibuat agar daftar pengguna tetap rapi. *(F1, BR-11)*
- Given pengguna belum punya data (kontak, perusahaan, deal, tugas, komentar, aktivitas, riwayat tahap), When saya menghapusnya, Then akun hilang permanen dan tercatat di audit log.
- Given pengguna sudah punya data, When saya mencoba menghapus, Then sistem menolak, menyebut jumlah datanya, dan menawarkan "Nonaktifkan saja".
- Given akun saya sendiri, Then tombol hapus tidak tersedia.

**US-24** — Sebagai Admin, saya ingin mengatur hak akses tiap pengguna untuk aksi penting agar akses sesuai tanggung jawabnya tanpa membuat peran baru. *(F16, BR-12)*
- Given saya membuka modal Tambah/Ubah pengguna, Then bagian "Hak akses" menampilkan daftar aksi penting yang dikelompokkan, tercentang sesuai default peran yang dipilih.
- Given saya mencentang hak yang bukan default (mis. Member diberi "Hapus deal"), When saya menyimpan, Then pengguna itu langsung bisa melakukan aksi tersebut tanpa login ulang; hak tersebut ditandai "Ditambahkan".
- Given saya menghapus centang hak default (mis. Manager dicabut "Kelola pengaturan"), Then pengguna langsung kehilangan akses dan menu terkait hilang; hak tersebut ditandai "Dicabut".
- Given saya mengganti peran di modal, Then centang kembali ke default peran baru dan bisa disesuaikan lagi; tombol "Default peran" mengembalikan pilihan ke default.
- Given peran Admin dipilih, Then semua hak tercentang dan terkunci.
- Given pengguna punya pengecualian, Then di daftar pengguna muncul badge "Akses khusus".
- Given akun saya sendiri, Then hak akses tidak dapat saya ubah; "Kelola pengguna" tidak pernah dapat diberikan ke peran selain Admin.

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
4. **Kelola pengguna:** Admin membuat akun langsung dengan password awal (tanpa email undangan sampai SMTP tersedia). Pengguna yang sudah punya data tidak dihapus, cukup dinonaktifkan, agar riwayat tetap utuh.
5. **Lupa password:** direset oleh Admin dari menu Pengguna; tidak ada reset mandiri lewat email.
6. **Hak akses:** per pengguna dan per aksi penting. Default mengikuti peran; Admin menambah/mencabut hak untuk orang tertentu di modal Ubah pengguna. Kelola pengguna tetap khusus peran Admin.
