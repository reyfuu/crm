# Functional Requirements Document (FRD)
**Produk:** CRM + Kanban Internal
**Versi:** 1.1 · **Tanggal:** 31 Oktober 2026 · **Referensi:** [BRD.md](BRD.md), [PRD.md](PRD.md)
**Revisi 1.1:** modul AUTH diperluas dengan kelola pengguna (FR-AUTH-05, 06, 08..11), aturan BRL-USER, dan hak akses per pengguna (bagian 2.1, FR-AUTH-12, BRL-ACCESS).

---

## 1. Pendahuluan
Dokumen ini menjabarkan perilaku fungsional setiap modul MVP: apa yang dilakukan sistem, data yang diterima, aturan bisnis, dan validasinya. Format ID: `FR-<MODUL>-<nomor>`.

| Kode modul | Modul |
|------------|-------|
| AUTH | Autentikasi & Pengguna |
| CON | Kontak |
| COM | Perusahaan |
| ACT | Aktivitas & Catatan |
| DEAL | Pipeline Deal (Kanban) |
| TASK | Task Board (Kanban) |
| NOTIF | Notifikasi |
| DASH | Dashboard |
| SRCH | Pencarian & Filter |
| IO | Import / Export |
| SET | Pengaturan |

## 2. Peran & Hak Akses (RBAC)
| Peran | Deskripsi |
|-------|-----------|
| **Admin** | Akses penuh termasuk pengguna, pengaturan, hapus data |
| **Manager** | Melihat & mengubah semua data CRM dan board; mengatur pipeline & board; tidak mengelola pengguna |
| **Member** | Melihat semua kontak, perusahaan, dan deal (satu board pipeline bersama); boleh mengubah & menggeser deal siapa pun; kontak/perusahaan hanya miliknya; board tugas di mana ia anggota |

### Matriks Hak Akses (default peran)
Kolom **Kode hak** menandai aksi yang dapat ditambah/dicabut per pengguna (bagian 2.1). Aksi tanpa kode berlaku tetap.

| Aksi | Kode hak | Admin | Manager | Member |
|------|----------|:-----:|:-------:|:------:|
| Kelola pengguna, reset password, atur hak akses | — (khusus Admin) | ✅ | ❌ | ❌ |
| Lihat semua kontak & perusahaan | — | ✅ | ✅ | ✅ (read) |
| Buat kontak/perusahaan | — | ✅ | ✅ | ✅ |
| Ubah kontak/perusahaan | `contact.updateAll` | ✅ | ✅ | Milik sendiri |
| Hapus kontak/perusahaan | `contact.delete` | ✅ | ✅ | ❌ |
| Lihat deal (board pipeline bersama) | — | ✅ | ✅ | ✅ |
| Buat/ubah/geser deal (termasuk Won/Lost) | — | ✅ | ✅ | ✅ semua deal |
| Hapus deal | `deal.delete` | ✅ | ✅ | ❌ |
| Ganti owner deal | `deal.changeOwner` | ✅ | ✅ | ❌ |
| Kelola pengaturan (tahap pipeline, alasan Lost, sumber lead) | `settings.manage` | ✅ | ✅ | ❌ |
| Buat board | — | ✅ | ✅ | ✅ (jadi owner board) |
| Lihat & ubah tugas di board yang bukan anggotanya (termasuk board privat) | `board.manageAll` | ✅ | ✅ | ❌ (hanya board tempat ia anggota) |
| Hapus tugas & komentar orang lain | `task.deleteAny` | ✅ | ✅ | ❌ (hanya buatan sendiri) |
| Import CSV | `data.import` | ✅ | ✅ | ❌ |
| Export CSV | `data.export` | ✅ | ✅ | ❌ |
| Kinerja tim di dashboard | `dashboard.team` | ✅ | ✅ | ❌ (data pipeline & tugas sendiri) |
| Lihat audit log | `audit.view` | ✅ | ❌ | ❌ |

### 2.1 Hak Akses per Pengguna
Setiap pengguna memiliki **hak efektif** = default peran + hak yang ditambahkan − hak yang dicabut. Admin mengatur pengecualian ini di modal Tambah/Ubah pengguna (FR-AUTH-12). Tabel berikut adalah daftar hak yang dapat diatur beserta default tiap peran:

| Kode | Aksi | Admin | Manager | Member |
|------|------|:-----:|:-------:|:------:|
| `contact.updateAll` | Ubah semua kontak & perusahaan (bukan hanya milik sendiri) | ✅ | ✅ | ❌ |
| `contact.delete` | Hapus kontak & perusahaan | ✅ | ✅ | ❌ |
| `deal.delete` | Hapus deal | ✅ | ✅ | ❌ |
| `deal.changeOwner` | Ganti owner deal | ✅ | ✅ | ❌ |
| `board.manageAll` | Akses semua board (lihat & ubah tugas di board mana pun, termasuk board privat) | ✅ | ✅ | ❌ |
| `task.deleteAny` | Hapus tugas & komentar orang lain | ✅ | ✅ | ❌ |
| `dashboard.team` | Lihat kinerja tim di dashboard | ✅ | ✅ | ❌ |
| `data.import` | Import data (CSV) | ✅ | ✅ | ❌ |
| `data.export` | Export data (CSV) | ✅ | ✅ | ❌ |
| `settings.manage` | Kelola pengaturan (tahap pipeline, alasan Lost, sumber lead) | ✅ | ✅ | ❌ |
| `audit.view` | Lihat audit log | ✅ | ❌ | ❌ |
| *(tetap)* | Kelola pengguna, reset password, atur hak akses | ✅ | ❌ | ❌ |

Hak yang **tidak** dapat diatur (berlaku untuk semua pengguna): melihat kontak/perusahaan/deal, membuat kontak/perusahaan/deal, mengubah & menggeser deal siapa pun (BRL-DEAL-3), mengubah kontak/perusahaan milik sendiri, membuat board, dan mengubah tugas di board tempat ia menjadi anggota.

> Semua pengguna melihat seluruh deal tim dalam **satu board pipeline bersama**. Semua pengguna boleh mengubah dan menggeser deal siapa pun; setiap perubahan tercatat di histori dengan nama pelakunya. Hapus deal dan ganti owner tetap khusus Admin/Manager.

---

## 3. Modul AUTH — Autentikasi & Pengguna
*Referensi: US-01, US-02, US-21, US-22, US-23 · BR-07, BR-11*

| ID | Fungsi | Detail |
|----|--------|--------|
| FR-AUTH-01 | Login email & password | Input: email, password. Sukses → sesi dibuat, redirect ke `/dashboard`. Gagal → pesan generik "Email atau password salah". |
| FR-AUTH-02 | Pembatasan percobaan login | 5 kali gagal dalam 15 menit per email/IP → kunci 15 menit. |
| FR-AUTH-03 | Logout | Menghapus sesi aktif. |
| FR-AUTH-04 | Lupa password | Tombol "Lupa kata sandi?" di halaman login menampilkan petunjuk untuk menghubungi Admin. Admin membuat password baru lewat FR-AUTH-09 dan membagikannya secara pribadi. Tidak ada reset mandiri lewat email. |
| FR-AUTH-05 | Tambah pengguna (Admin) | Input: nama*, email*, peran*, password awal* (tombol "Acak" membuat password yang memenuhi aturan). Akun langsung aktif. Setelah tersimpan, email & password tampil **sekali** dengan tombol Salin untuk dibagikan lewat jalur pribadi. Undangan via email (tautan aktivasi 72 jam) menyusul setelah SMTP tersedia. |
| FR-AUTH-06 | Ubah pengguna (Admin) | Field: nama, email, peran, status aktif. Pengguna nonaktif tidak bisa login dan sesi yang sedang berjalan langsung berakhir (FR-AUTH-11); kepemilikan data tetap. Berlaku BRL-USER-1..3. |
| FR-AUTH-07 | Profil | Pengguna dapat mengubah nama, foto, password. *(belum dibangun)* |
| FR-AUTH-08 | Daftar pengguna (Admin) | Halaman `/settings/users`: nama, email, peran, status, login terakhir, tanggal dibuat. Pencarian nama/email; filter peran & status (aktif/nonaktif); ringkasan jumlah aktif/nonaktif. Akun sendiri ditandai "(Anda)". |
| FR-AUTH-09 | Reset password oleh Admin | Admin mengisi password baru (atau acak) untuk pengguna mana pun. Password lama langsung tidak berlaku; password baru tampil sekali untuk dibagikan. |
| FR-AUTH-10 | Hapus pengguna (Admin) | Hapus permanen hanya untuk pengguna yang **belum punya data** (BRL-USER-4). Jika ditolak, sistem menyebut jumlah datanya dan menawarkan tombol "Nonaktifkan saja". Keanggotaan board, assignment tugas, dan notifikasinya ikut terhapus. |
| FR-AUTH-11 | Perubahan akses berlaku seketika | Setiap permintaan halaman/aksi memeriksa nama, peran, hak akses, dan status pengguna di database (bukan dari isi token sesi). Akun yang dinonaktifkan/dihapus otomatis dikeluarkan ke halaman login dengan pesan "Akun Anda sudah dinonaktifkan atau dihapus". |

| FR-AUTH-12 | Atur hak akses per pengguna (Admin) | Di modal Tambah/Ubah pengguna terdapat bagian "Hak akses": daftar hak pada bagian 2.1, dikelompokkan (Kontak & perusahaan, Pipeline, Board & tugas, Laporan & data, Administrasi). Nilai awal = default peran. Hak yang berbeda dari default diberi tanda "Ditambahkan"/"Dicabut"; tombol "Default peran" mengembalikan ke default. Mengganti peran di modal mengatur ulang centang ke default peran baru. Peran Admin: semua tercentang & terkunci. Daftar pengguna menandai pengguna dengan pengecualian sebagai "Akses khusus". Menu dan tombol yang tidak diizinkan disembunyikan, dan server tetap menolak aksinya. |

**Aturan bisnis pengguna**
- BRL-USER-1: Admin tidak dapat mengubah peran akun sendiri atau menonaktifkan akun sendiri.
- BRL-USER-2: Harus selalu ada minimal satu **Admin aktif**. Menurunkan peran, menonaktifkan, atau menghapus Admin aktif terakhir ditolak.
- BRL-USER-3: Email unik (tidak membedakan huruf besar/kecil) dan disimpan dalam huruf kecil.
- BRL-USER-4: Pengguna yang tercatat sebagai owner kontak/perusahaan/deal, pembuat tugas, penulis komentar/aktivitas, atau pelaku perpindahan tahap tidak dapat dihapus, hanya dinonaktifkan, agar riwayat tetap utuh.
- BRL-USER-5: Admin tidak dapat menghapus akun sendiri.
- BRL-USER-6: Setiap tambah, ubah (termasuk perubahan peran, status, & hak akses), reset password, dan hapus pengguna dicatat di audit log beserta pelaku dan perubahan nilainya.

**Aturan bisnis hak akses**
- BRL-ACCESS-1: Hak efektif = default peran + ditambahkan − dicabut. Yang disimpan hanya selisihnya terhadap default peran, sehingga perubahan default di masa depan tetap berlaku bagi pengguna tanpa pengecualian.
- BRL-ACCESS-2: Peran Admin selalu memiliki semua hak; pengecualian untuk Admin diabaikan dan dikosongkan.
- BRL-ACCESS-3: Kelola pengguna, reset password, dan pengaturan hak akses khusus peran Admin dan tidak dapat diberikan ke peran lain.
- BRL-ACCESS-4: Admin tidak dapat mengubah hak akses akun sendiri.
- BRL-ACCESS-5: Jika peran diganti tanpa mengirim pilihan hak, pengecualian lama dihapus dan pengguna memakai default peran baru.
- BRL-ACCESS-6: Perubahan hak berlaku pada permintaan berikutnya tanpa login ulang (FR-AUTH-11) dan dicatat sebagai `PERMISSIONS_CHANGED` di audit log.

**Validasi:** nama 2–100 karakter; email unik & format valid; password 8–72 karakter, mengandung huruf dan angka.

---

## 4. Modul CON — Kontak
*Referensi: US-03, US-05, US-08 · BR-01, BR-05*

| ID | Fungsi | Detail |
|----|--------|--------|
| FR-CON-01 | Buat kontak | Field: nama depan* , nama belakang, email, telepon, jabatan, perusahaan (pilih/buat baru), sumber lead (Website, Referral, Iklan, Event, WhatsApp, Lainnya), status (Lead, Prospect, Customer, Inactive), tag, owner (default: pembuat), alamat, catatan. *Wajib: nama depan + (email atau telepon).* |
| FR-CON-02 | Deteksi duplikat | Saat simpan, jika email atau telepon (dinormalisasi ke format +62) sudah ada → tampilkan peringatan dengan tautan ke kontak lama; pengguna dapat tetap menyimpan atau membatalkan. |
| FR-CON-03 | Daftar kontak | Tabel dengan kolom: nama, perusahaan, email, telepon, status, owner, tag, aktivitas terakhir. Paginasi 25/50/100. Sort per kolom. |
| FR-CON-04 | Detail kontak | Header info, tab: Timeline aktivitas, Deal, Tugas, Info. Tombol cepat: Catat aktivitas, Buat deal, Buat tugas. |
| FR-CON-05 | Ubah kontak | Inline edit di halaman detail; perubahan owner/status dicatat ke timeline. |
| FR-CON-06 | Hapus kontak | Soft delete (`deletedAt`). Dapat dipulihkan Admin dalam 30 hari. Deal terkait tidak ikut terhapus; relasi kontak di-null-kan setelah hapus permanen. |
| FR-CON-07 | Gabungkan duplikat (Admin/Manager) | Pilih 2 kontak → pilih nilai per field → aktivitas, deal, tugas dipindah ke kontak utama. |
| FR-CON-08 | Aksi massal | Pilih banyak kontak → ganti owner, tambah/hapus tag, ubah status, hapus. |

---

## 5. Modul COM — Perusahaan
*Referensi: US-04 · BR-01*

| ID | Fungsi | Detail |
|----|--------|--------|
| FR-COM-01 | Buat perusahaan | Field: nama* (unik, case-insensitive), domain/website, industri, ukuran (1–10, 11–50, 51–200, 201–1000, 1000+), telepon, alamat, kota, owner, tag. |
| FR-COM-02 | Daftar perusahaan | Tabel: nama, industri, kota, jumlah kontak, total nilai deal terbuka, owner. |
| FR-COM-03 | Detail perusahaan | Tab: Kontak, Deal, Timeline aktivitas (gabungan seluruh kontak), Info. |
| FR-COM-04 | Ubah / hapus | Soft delete; kontak terkait tetap ada dengan perusahaan kosong. |

---

## 6. Modul ACT — Aktivitas & Catatan
*Referensi: US-08 · BR-05*

| ID | Fungsi | Detail |
|----|--------|--------|
| FR-ACT-01 | Catat aktivitas manual | Tipe: Catatan, Telepon, Meeting, Email, WhatsApp, Lainnya. Field: tipe*, isi*, tanggal/waktu (default sekarang), terkait ke kontak/perusahaan/deal (minimal satu). |
| FR-ACT-02 | Log otomatis (system) | Sistem membuat aktivitas tipe `SYSTEM` untuk: kontak/deal dibuat, deal pindah tahap, deal Won/Lost, owner berubah, tugas terkait selesai. |
| FR-ACT-03 | Timeline | Urut terbaru di atas, filter per tipe, infinite scroll. Aktivitas deal juga muncul di timeline kontak & perusahaan terkait. |
| FR-ACT-04 | Ubah / hapus aktivitas | Hanya penulis (atau Admin/Manager), aktivitas `SYSTEM` tidak dapat diubah. |

---

## 7. Modul DEAL — Pipeline Deal (Kanban)
*Referensi: US-09 s/d US-12 · BR-02, BR-06, BR-09*

### 7.1 Fungsi
| ID | Fungsi | Detail |
|----|--------|--------|
| FR-DEAL-01 | Buat deal | Field: judul*, nilai (IDR, ≥ 0), kontak utama, perusahaan, tahap* (default tahap pertama), perkiraan tanggal closing, owner (default pembuat), prioritas (Low/Medium/High), catatan. |
| FR-DEAL-02 | Tampilan Kanban | Satu kolom per tahap. Header kolom: nama tahap, jumlah deal, total nilai, nilai berbobot (nilai × probabilitas). Kartu: judul, perusahaan/kontak, nilai, owner (avatar), tanggal closing (merah bila lewat), indikator tugas terbuka. |
| FR-DEAL-03 | Drag & drop antar tahap | Memindah kartu mengubah `stageId` dan `position`. Histori dicatat di `DealStageHistory` (dari, ke, oleh, waktu) dan timeline. |
| FR-DEAL-04 | Urutkan dalam kolom | Drag di kolom yang sama mengubah `position` saja. |
| FR-DEAL-05 | Tandai Won | Via tombol atau drag ke tahap bertipe WON. Status = WON, `closedAt` = sekarang. Kartu keluar dari board aktif (dapat dilihat via filter "Tertutup"). |
| FR-DEAL-06 | Tandai Lost | Via tombol atau drag ke tahap bertipe LOST → modal wajib: alasan (daftar dari pengaturan + "Lainnya" dengan teks). Tanpa alasan, perpindahan dibatalkan. |
| FR-DEAL-07 | Buka kembali deal | Semua pengguna dapat mengembalikan deal WON/LOST ke tahap terbuka; tercatat di histori. |
| FR-DEAL-08 | Filter board | Owner, prioritas, rentang tanggal closing, rentang nilai, tag, pencarian judul. Filter tersimpan di URL. |
| FR-DEAL-09 | Detail deal (drawer) | Klik kartu → drawer samping: info editable, timeline, tugas terkait, histori tahap. |
| FR-DEAL-10 | Deal macet | Deal yang tidak berpindah tahap > N hari (N per tahap, default 14) diberi penanda "macet". |

### 7.2 Aturan Bisnis
- BRL-DEAL-0: Sistem hanya memiliki **satu pipeline** penjualan; semua deal tampil di satu board bersama.
- BRL-DEAL-1: Pipeline minimal memiliki 1 tahap OPEN, tepat 1 tahap WON, dan tepat 1 tahap LOST.
- BRL-DEAL-2: Probabilitas tahap 0–100%; WON = 100%, LOST = 0%.
- BRL-DEAL-3: Semua pengguna dapat menggeser deal siapa pun. Jika deal milik orang lain dipindah, owner deal menerima notifikasi (FR-NOTIF-06) dan perpindahan tercatat di histori beserta pelakunya.
- BRL-DEAL-4: Jika dua pengguna memindah kartu yang sama bersamaan, perubahan terakhir yang menang; klien yang kalah menerima data terbaru saat refresh/polling.
- BRL-DEAL-5: Kolom menampilkan maksimal 50 kartu awal; sisanya dimuat dengan "Muat lebih banyak".

---

## 8. Modul TASK — Task Board (Kanban)
*Referensi: US-13 s/d US-18 · BR-03, BR-04*

### 8.1 Fungsi
| ID | Fungsi | Detail |
|----|--------|--------|
| FR-TASK-01 | Buat board | Field: nama*, deskripsi, warna, visibilitas (Semua pengguna / Anggota saja), template kolom (Basic: To Do–In Progress–Done; Review: + Review). Pembuat otomatis menjadi owner board. |
| FR-TASK-02 | Kelola kolom | Tambah, ganti nama, ubah urutan (drag), hapus (hanya jika kosong atau kartu dipindah ke kolom lain), tandai kolom sebagai "Done", set WIP limit opsional. |
| FR-TASK-03 | Kelola anggota board | Owner board/Manager/Admin menambah atau menghapus anggota. |
| FR-TASK-04 | Buat tugas | Field: judul*, deskripsi (rich text sederhana/markdown), kolom*, assignee (satu atau lebih), due date, prioritas (Low/Medium/High/Urgent), label, terkait ke kontak/deal (opsional). Quick-add: ketik judul di bawah kolom lalu Enter. |
| FR-TASK-05 | Drag & drop tugas | Antar kolom dan urutan dalam kolom. Pindah ke kolom "Done" → `completedAt` diisi; keluar dari "Done" → `completedAt` dikosongkan. |
| FR-TASK-06 | WIP limit | Jika kolom melebihi WIP limit, header kolom berwarna peringatan (tidak memblokir). |
| FR-TASK-07 | Checklist | Tambah/centang/hapus/urutkan item; kartu menampilkan progres (mis. 3/5). |
| FR-TASK-08 | Komentar & mention | Komentar teks dengan `@nama` → notifikasi ke yang di-mention. Penulis dapat ubah/hapus komentarnya. |
| FR-TASK-09 | Lampiran | Unggah file ≤ 10 MB per file (gambar, PDF, dokumen). *(Should)* |
| FR-TASK-10 | Detail tugas (modal) | Semua field editable, checklist, komentar, log perubahan. |
| FR-TASK-11 | Filter board | Assignee, label, prioritas, due (terlambat/hari ini/minggu ini), pencarian. |
| FR-TASK-12 | Tugas follow-up CRM | Dari kontak/deal → "Buat tugas" → masuk ke board default "Follow-up Sales" (dibuat otomatis saat instalasi) dengan relasi ke kontak/deal. |
| FR-TASK-13 | Tugas Saya | Halaman berisi semua tugas yang di-assign ke pengguna lintas board, dikelompokkan: Terlambat, Hari ini, 7 hari ke depan, Tanpa tanggal. Centang = pindah ke kolom Done board terkait. |
| FR-TASK-14 | Arsip | Tugas & board dapat diarsipkan dan dipulihkan. |

### 8.2 Aturan Bisnis
- BRL-TASK-1: Setiap board minimal memiliki 1 kolom dan maksimal 1 kolom bertanda "Done".
- BRL-TASK-2: Hanya anggota board (atau Admin/Manager) yang dapat melihat board ber-visibilitas "Anggota saja".
- BRL-TASK-3: Assignee harus anggota board; jika bukan, ia otomatis ditambahkan sebagai anggota.
- BRL-TASK-4: Tugas terlambat = `dueDate < sekarang` dan `completedAt` kosong.

---

## 9. Modul NOTIF — Notifikasi
*Referensi: US-19 · BR-03*

| ID | Pemicu | Penerima |
|----|--------|----------|
| FR-NOTIF-01 | Di-assign ke tugas | Assignee |
| FR-NOTIF-02 | Di-mention di komentar | Yang di-mention |
| FR-NOTIF-03 | Tugas jatuh tempo hari ini (dikirim 08.00) & terlambat | Assignee |
| FR-NOTIF-04 | Deal/kontak dialihkan kepemilikannya | Owner baru |
| FR-NOTIF-05 | Komentar baru pada tugas yang di-assign ke saya | Assignee |
| FR-NOTIF-06 | Deal saya dipindah tahap / diubah / ditandai Won-Lost oleh orang lain | Owner deal |

- Ikon lonceng dengan jumlah belum dibaca; klik notifikasi membuka objek terkait dan menandainya terbaca; tombol "Tandai semua dibaca".
- Notifikasi diperbarui otomatis (polling ≤ 30 detik di MVP).
- Notifikasi email harian (digest) bersifat opsional per pengguna. *(Could)*

---

## 10. Modul DASH — Dashboard
*Referensi: US-20 · BR-06*

| ID | Widget | Detail |
|----|--------|--------|
| FR-DASH-01 | Kartu ringkasan | Nilai pipeline terbuka, nilai berbobot, deal Won bulan ini (jumlah & nilai), win rate 90 hari. |
| FR-DASH-02 | Funnel pipeline | Jumlah & nilai deal per tahap (bar chart). |
| FR-DASH-03 | Tren Won vs Lost | Per bulan, 6 bulan terakhir. |
| FR-DASH-04 | Alasan Lost teratas | 5 alasan terbanyak. |
| FR-DASH-05 | Kinerja tim (Manager/Admin) | Tabel per sales: deal terbuka, Won, nilai Won, tugas terlambat. |
| FR-DASH-06 | Tugas saya hari ini | Daftar ringkas + tautan ke Tugas Saya. |
| FR-DASH-07 | Filter | Periode (bulan ini, kuartal, custom), owner. |

Semua pengguna melihat angka pipeline seluruh tim (FR-DASH-01..04); widget Kinerja tim (FR-DASH-05) hanya untuk Manager/Admin.

---

## 11. Modul SRCH — Pencarian & Filter
| ID | Fungsi | Detail |
|----|--------|--------|
| FR-SRCH-01 | Pencarian global | Shortcut `Ctrl/Cmd + K`; mencari kontak (nama, email, telepon), perusahaan, deal, tugas. Hasil dikelompokkan per tipe, maks 5 per tipe. |
| FR-SRCH-02 | Filter daftar | Kombinasi filter (AND) per halaman daftar; state filter tersimpan di URL agar bisa dibagikan. |
| FR-SRCH-03 | Toleransi | Pencarian tidak peka huruf besar/kecil dan mendukung pencocokan sebagian. |

---

## 12. Modul IO — Import / Export
*Referensi: US-06, US-07 · BR-08*

| ID | Fungsi | Detail |
|----|--------|--------|
| FR-IO-01 | Import CSV kontak/perusahaan | Langkah: unggah (≤ 5 MB / 10.000 baris) → pemetaan kolom → preview (valid, error, duplikat) → pilih aksi duplikat (lewati/perbarui/buat baru) → proses → ringkasan hasil + unduh baris gagal. |
| FR-IO-02 | Import deal | Sama seperti FR-IO-01; tahap dicocokkan berdasarkan nama. |
| FR-IO-03 | Export CSV | Kontak, perusahaan, deal sesuai filter aktif; encoding UTF-8 dengan BOM agar terbaca Excel. |
| FR-IO-04 | Template | Unduh template CSV contoh untuk setiap entitas. |

---

## 13. Modul SET — Pengaturan
*Referensi: US-12, US-13 · BR-09*

| ID | Fungsi | Detail |
|----|--------|--------|
| FR-SET-01 | Tahap pipeline | Tambah/ubah/urutkan/hapus tahap, set probabilitas & batas hari macet. Hapus tahap wajib memindah deal yang ada. |
| FR-SET-02 | Alasan Lost | Kelola daftar alasan. |
| FR-SET-03 | Tag & label | Kelola tag (kontak/perusahaan/deal) dan label tugas beserta warnanya. |
| FR-SET-04 | Sumber lead | Kelola daftar sumber lead. |
| FR-SET-05 | Umum | Nama perusahaan, logo, mata uang (default IDR), zona waktu (default Asia/Jakarta). |
| FR-SET-06 | Audit log (hak `audit.view`) | Daftar aksi penting: login, tambah/ubah/hapus pengguna, perubahan peran, perubahan hak akses, aktivasi/nonaktifkan akun, reset password, hapus data, import, export. |

---

## 14. Keterlacakan
| BR | User Story | Functional Requirement |
|----|-----------|------------------------|
| BR-01 | US-03, US-04, US-05 | FR-CON-01..08, FR-COM-01..04, FR-SRCH-01..03 |
| BR-02 | US-09, US-10, US-11 | FR-DEAL-01..10 |
| BR-03 | US-17, US-18, US-19 | FR-TASK-12, FR-TASK-13, FR-NOTIF-01..06 |
| BR-04 | US-13..US-16 | FR-TASK-01..11, FR-TASK-14 |
| BR-05 | US-08 | FR-ACT-01..04 |
| BR-06 | US-11, US-20 | FR-DASH-01..07 |
| BR-07 | US-01, US-02 | FR-AUTH-01..04, FR-AUTH-07, Matriks RBAC |
| BR-08 | US-06, US-07 | FR-IO-01..04 |
| BR-09 | US-12, US-13 | FR-SET-01..04, FR-TASK-02 |
| BR-10 | — (Fase 2) | — |
| BR-11 | US-02, US-21, US-22, US-23 | FR-AUTH-05, 06, 08..11, BRL-USER-1..6, FR-SET-06 |
| BR-12 | US-24 | Bagian 2.1, FR-AUTH-12, BRL-ACCESS-1..6 |
