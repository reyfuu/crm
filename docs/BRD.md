# Business Requirements Document (BRD)
**Proyek:** CRM + Kanban Internal
**Versi:** 1.1 · **Tanggal:** 31 Oktober 2026 · **Status:** Draft
**Revisi 1.1:** menambah BR-11 kelola pengguna (tambah, ubah, nonaktifkan, hapus, reset password) dan BR-12 manajemen hak akses per pengguna.

---

## 1. Ringkasan Eksekutif
Perusahaan membutuhkan satu aplikasi terpusat untuk mengelola data pelanggan (kontak & perusahaan), memantau peluang penjualan (deal) dalam bentuk pipeline Kanban, dan mengelola tugas tim dalam board Kanban. Saat ini data tersebar di spreadsheet, chat WhatsApp, dan catatan pribadi, sehingga lead sering terlewat, follow-up terlambat, dan manajemen tidak punya gambaran pipeline yang akurat.

Aplikasi akan dibangun sebagai sistem **internal (single-tenant)** untuk dipakai oleh seluruh tim sales, marketing, dan operasional.

## 2. Latar Belakang & Masalah
| # | Masalah saat ini | Dampak bisnis |
|---|------------------|---------------|
| P1 | Data lead & pelanggan tersebar di spreadsheet, WA, dan catatan pribadi | Data duplikat/hilang, sulit dicari, hilang saat karyawan keluar |
| P2 | Tidak ada tampilan status pipeline penjualan yang real-time | Forecast pendapatan tidak akurat, keputusan lambat |
| P3 | Follow-up bergantung pada ingatan masing-masing sales | Lead dingin, peluang hilang |
| P4 | Tugas tim dikelola lewat chat | Tugas terlupa, tidak jelas siapa penanggung jawab & deadline |
| P5 | Tidak ada riwayat interaksi dengan pelanggan | Komunikasi tidak konsisten saat pelanggan ditangani orang lain |
| P6 | Laporan dibuat manual tiap minggu | Membuang waktu, rawan salah |

## 3. Tujuan Bisnis & KPI
| Tujuan | KPI | Target (3 bulan setelah go-live) |
|--------|-----|----------------------------------|
| G1. Semua data pelanggan terpusat | % lead baru yang tercatat di CRM | 100% |
| G2. Respons lead lebih cepat | Rata-rata waktu dari lead masuk → aktivitas pertama | < 24 jam |
| G3. Pipeline transparan | Manajer bisa melihat nilai pipeline per tahap tanpa laporan manual | Real-time, 0 laporan manual |
| G4. Meningkatkan konversi | Win rate deal | Naik 10% dari baseline |
| G5. Tugas tim terlacak | % tugas yang selesai tepat waktu | ≥ 80% |
| G6. Adopsi sistem | Pengguna aktif mingguan / total pengguna | ≥ 90% |
| G7. Akses terkendali | % akun karyawan yang keluar dinonaktifkan paling lambat pada hari terakhir kerja | 100% |

## 4. Stakeholder & Peran
| Stakeholder | Peran di sistem | Kepentingan |
|-------------|-----------------|-------------|
| Owner / Direktur | Admin | Visibilitas penuh, laporan, kontrol akses |
| Sales Manager | Manager | Memantau pipeline & kinerja tim, membagi lead |
| Sales / Account Executive | Member (Sales) | Mengelola kontak miliknya, memperbarui deal di board bersama, follow-up |
| Staff Operasional / Marketing | Member (Staff) | Mengerjakan & memperbarui tugas di board |
| Tim IT / Developer | — | Membangun, merawat, dan mengamankan sistem |

## 5. Business Requirements
| ID | Requirement | Prioritas | Mengatasi |
|----|-------------|-----------|-----------|
| BR-01 | Sistem harus menyimpan data kontak dan perusahaan secara terpusat, dapat dicari, dan bebas duplikat | Must | P1 |
| BR-02 | Sistem harus menampilkan pipeline deal dalam bentuk Kanban beserta nilai per tahap | Must | P2 |
| BR-03 | Sistem harus membantu sales tidak melewatkan follow-up (tugas, tenggat, pengingat) | Must | P3 |
| BR-04 | Sistem harus menyediakan board Kanban untuk mengelola tugas tim dengan penanggung jawab dan deadline | Must | P4 |
| BR-05 | Sistem harus mencatat riwayat aktivitas & catatan untuk setiap kontak, perusahaan, dan deal | Must | P5 |
| BR-06 | Sistem harus menyediakan dashboard ringkasan pipeline dan kinerja tanpa laporan manual | Must | P6 |
| BR-07 | Akses data harus dibatasi berdasarkan peran pengguna | Must | Keamanan |
| BR-08 | Data lama dari spreadsheet harus dapat dipindahkan (import) dan data dapat diekspor | Should | P1 |
| BR-09 | Tahap pipeline dan kolom board harus dapat disesuaikan tanpa bantuan developer | Should | Fleksibilitas |
| BR-10 | Sistem harus dapat diintegrasikan dengan WhatsApp & Email di fase berikutnya | Could (Fase 2) | P5 |
| BR-11 | Admin harus dapat mengelola akun pengguna secara mandiri (tambah, ubah data & peran, nonaktifkan, hapus, reset password) tanpa bantuan developer, dan perubahan akses harus berlaku seketika | Must | Keamanan |
| BR-12 | Admin harus dapat menyesuaikan hak akses tiap pengguna untuk aksi penting (menambah atau mencabut hak di atas default perannya) tanpa membuat peran baru, dan perubahannya berlaku seketika | Must | Keamanan, Fleksibilitas |

## 6. Ruang Lingkup
### 6.1 Dalam Lingkup (MVP)
- Manajemen pengguna & peran (Admin, Manager, Member): tambah, ubah, nonaktifkan, hapus, dan reset password oleh Admin
- Manajemen hak akses per pengguna: default mengikuti peran, Admin dapat menambah/mencabut hak aksi penting untuk orang tertentu
- Kontak & Perusahaan (CRUD, tag, pencarian, filter, import/export CSV)
- Pipeline Deal berbasis Kanban (drag & drop, Won/Lost, nilai deal)
- Task Board berbasis Kanban (board, kolom, kartu tugas, checklist, komentar)
- Aktivitas & catatan (timeline)
- Notifikasi dalam aplikasi
- Dashboard ringkasan

### 6.2 Di Luar Lingkup (MVP)
- Integrasi WhatsApp, Email, telepon (Fase 2)
- Otomasi workflow (mis. auto-assign, auto-move) (Fase 2)
- Aplikasi mobile native (cukup web responsif)
- Multi-tenant / penjualan sebagai SaaS
- Invoicing, akuntansi, inventori
- Laporan kustom tingkat lanjut (Fase 2)

## 7. Asumsi
- Jumlah pengguna awal 5–50 orang; data hingga ~50.000 kontak dan ~10.000 deal.
- Semua pengguna memiliki akses internet dan browser modern.
- Bahasa antarmuka: Bahasa Indonesia; mata uang default: IDR.
- Hanya satu pipeline penjualan, ditampilkan sebagai satu board bersama untuk seluruh tim.
- Login hanya dengan email & password (tanpa login Google/SSO).

## 8. Batasan
- Tim pengembang kecil; MVP ditargetkan selesai dalam ±8–10 minggu.
- Stack ditetapkan: Next.js + Prisma + PostgreSQL.
- Biaya infrastruktur dijaga rendah (satu server/VPS atau layanan terkelola tier kecil).

## 9. Risiko & Mitigasi
| Risiko | Kemungkinan | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Adopsi rendah (tim tetap pakai spreadsheet/WA) | Sedang | Tinggi | UI sederhana, import data lama, pelatihan, manajer mewajibkan pencatatan |
| Data hasil import kotor/duplikat | Tinggi | Sedang | Validasi & deteksi duplikat saat import, preview sebelum simpan |
| Scope creep | Tinggi | Sedang | Patuh pada MoSCoW, fitur baru masuk backlog Fase 2 |
| Kebocoran data pelanggan | Rendah | Tinggi | RBAC, enkripsi koneksi, backup, audit log |
| Karyawan yang keluar masih bisa mengakses data | Sedang | Tinggi | Admin menonaktifkan akun; sesi yang sedang berjalan langsung terputus; semua perubahan akun tercatat di audit log |
| Admin terakhir terkunci/terhapus sehingga tidak ada yang bisa mengelola sistem | Rendah | Tinggi | Sistem menolak menurunkan, menonaktifkan, atau menghapus Admin aktif terakhir |
| Hak akses khusus menumpuk dan sulit diawasi | Sedang | Sedang | Pengguna dengan pengecualian ditandai "Akses khusus" di daftar pengguna; tombol kembali ke default peran; setiap perubahan hak tercatat di audit log |
| Penyalahgunaan hak untuk menaikkan akses sendiri | Rendah | Tinggi | Hanya Admin yang dapat mengatur hak; kelola pengguna tidak dapat diberikan ke peran lain; Admin tidak dapat mengubah hak akunnya sendiri |
| Performa Kanban lambat saat data besar | Sedang | Sedang | Paginasi per kolom, indeks database, optimistic update |

## 10. Kriteria Sukses
1. Semua fitur MVP lolos UAT oleh perwakilan setiap peran.
2. Data spreadsheet lama berhasil dimigrasi.
3. KPI pada bagian 3 tercapai dalam 3 bulan setelah go-live.
4. Tidak ada insiden keamanan data.

## 11. Persetujuan
| Nama | Jabatan | Tanda tangan | Tanggal |
|------|---------|--------------|---------|
| | Owner | | |
| | Sales Manager | | |
| | Lead Developer | | |
