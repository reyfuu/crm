# DESIGN.md — Design System & UI
**Produk:** CRM + Kanban Internal
**Versi:** 1.0 · **Tanggal:** 31 Oktober 2026 · **Referensi:** [PRD.md](PRD.md), [FRD.md](FRD.md), [TRD.md](TRD.md)

Implementasi: Tailwind CSS v4 + shadcn/ui (Radix) + ikon lucide-react. Token di bawah dipetakan ke CSS variables shadcn (`--background`, `--primary`, dst.).

---

## 1. Prinsip Desain
1. **Tenang & padat informasi** — latar netral, warna hanya untuk makna (status, prioritas, aksi utama).
2. **Kanban terasa fisik** — kartu terangkat saat di-drag, placeholder jelas di tempat jatuh.
3. **Satu aksi utama per layar** — tombol primary hanya satu (mis. "+ Deal").
4. **Konteks tanpa pindah halaman** — detail dibuka di drawer/modal, board tetap terlihat.
5. **Keyboard-friendly** — semua aksi utama bisa dilakukan tanpa mouse.

## 2. Design Tokens

### 2.1 Warna
| Token | Light | Dark | Pemakaian |
|-------|-------|------|-----------|
| `background` | `#FFFFFF` | `#0B0D12` | Latar halaman |
| `surface` (muted) | `#F6F7F9` | `#12151C` | Latar kolom Kanban, sidebar |
| `card` | `#FFFFFF` | `#181C25` | Kartu, panel |
| `border` | `#E4E7EC` | `#262B36` | Garis pemisah |
| `foreground` | `#101828` | `#F2F4F7` | Teks utama |
| `muted-foreground` | `#667085` | `#98A2B3` | Teks sekunder |
| `primary` | `#4F46E5` (indigo-600) | `#6366F1` | Tombol utama, link, fokus |
| `primary-foreground` | `#FFFFFF` | `#FFFFFF` | Teks di atas primary |
| `success` | `#16A34A` | `#22C55E` | Won, selesai |
| `warning` | `#D97706` | `#F59E0B` | Jatuh tempo hari ini, WIP terlampaui, deal macet |
| `danger` | `#DC2626` | `#EF4444` | Lost, terlambat, hapus |
| `info` | `#0284C7` | `#38BDF8` | Informasi, aktivitas sistem |

**Warna prioritas:** Low `slate-400` · Medium `sky-500` · High `amber-500` · Urgent `red-600`.
**Warna status kontak:** Lead `slate` · Prospect `sky` · Customer `green` · Inactive `zinc` (badge soft: bg 10–15% opacity + teks warna penuh).
**Palet tag/label (pilihan pengguna):** slate, red, orange, amber, green, teal, sky, indigo, violet, pink.

Kontras teks minimal 4.5:1 (WCAG AA) di kedua mode.

### 2.2 Tipografi
- Font: **Inter** (fallback `system-ui, sans-serif`); angka tabular (`font-variant-numeric: tabular-nums`) untuk nilai uang & tabel.

| Token | Ukuran / line-height | Berat | Pemakaian |
|-------|---------------------|-------|-----------|
| `display` | 30 / 36 | 600 | Angka besar di dashboard |
| `h1` | 24 / 32 | 600 | Judul halaman |
| `h2` | 18 / 28 | 600 | Judul section, drawer |
| `h3` | 15 / 22 | 600 | Header kolom Kanban |
| `body` | 14 / 20 | 400 | Teks umum |
| `small` | 13 / 18 | 400 | Meta kartu, tabel |
| `caption` | 12 / 16 | 500 | Badge, label |

### 2.3 Spacing, Radius, Shadow
- **Spacing:** skala 4 px (4, 8, 12, 16, 20, 24, 32, 40, 48).
- **Radius:** `sm` 6 px (badge, input) · `md` 8 px (kartu, tombol) · `lg` 12 px (modal, drawer, panel) · `full` (avatar).
- **Shadow:**
  - `card`: `0 1px 2px rgba(16,24,40,.06)`
  - `card-hover`: `0 2px 6px rgba(16,24,40,.10)`
  - `drag`: `0 12px 24px rgba(16,24,40,.18)` + rotasi 2°
  - `overlay`: `0 20px 40px rgba(16,24,40,.20)`

### 2.4 Motion
- Durasi 150 ms (hover), 200 ms (drawer/modal), easing `cubic-bezier(.2,.8,.2,1)`.
- Kartu yang jatuh: animasi settle 150 ms. Hormati `prefers-reduced-motion` (matikan rotasi & animasi).

### 2.5 Breakpoint
| Nama | Lebar | Layout |
|------|-------|--------|
| `sm` | < 640 | Ponsel: sidebar jadi bottom nav/drawer, Kanban 1 kolom per layar (swipe) |
| `md` | 640–1023 | Tablet: sidebar collapsible (ikon saja) |
| `lg` | ≥ 1024 | Desktop: sidebar penuh 240 px |
| `xl` | ≥ 1440 | Konten lebar, drawer 480 px |

## 3. Layout Global
```
┌──────────────┬──────────────────────────────────────────────────────────┐
│ ◆ NamaCRM    │  🔍 Cari… (Ctrl+K)                     🔔 3   ☀/☾   (AV) ▾ │  ← Topbar 56px
│              ├──────────────────────────────────────────────────────────┤
│ ▣ Dashboard  │                                                          │
│ ☺ Kontak     │  Judul Halaman                         [Filter] [+ Aksi] │
│ ▦ Perusahaan │  ────────────────────────────────────────────────────    │
│ ⇶ Pipeline   │                                                          │
│ ☑ Tugas Saya │                     Area konten                          │
│ ── Board ──  │                                                          │
│  • Follow-up │                                                          │
│  • Marketing │                                                          │
│  + Board baru│                                                          │
│              │                                                          │
│ ⚙ Pengaturan │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
   Sidebar 240px
```

## 4. Komponen

### 4.1 Kartu Deal
```
┌────────────────────────────────┐
│ Pengadaan Laptop Q4      ● High│  ← judul (h3, 2 baris maks) + titik prioritas
│ PT Maju Jaya · Andi S.         │  ← perusahaan · kontak (small, muted)
│ Rp 125.000.000                 │  ← nilai (body, 600, tabular)
│ 📅 15 Nov   ☑ 2   ⏳ macet  (BS)│  ← closing (merah jika lewat), tugas terbuka, macet, avatar owner
└────────────────────────────────┘
```
- Lebar mengikuti kolom (280 px), padding 12 px, radius `md`, border 1 px.
- Hover: `card-hover` + muncul tombol "⋯" (menu: Buka, Won, Lost, Hapus).
- Semua kartu bisa di-drag oleh siapa pun. Filter cepat "Deal saya" di toolbar board. Menu "Hapus" hanya muncul untuk Admin/Manager.
- Dragging: shadow `drag`, opacity 0.95; placeholder di posisi asal: kotak garis putus-putus `border` setinggi kartu.

### 4.2 Kartu Tugas
```
┌────────────────────────────────┐
│ [Desain] [Urgent]              │  ← label (chip berwarna) + prioritas
│ Siapkan materi presentasi klien│
│ ☑ 3/5   💬 2   📎 1             │  ← checklist, komentar, lampiran
│ 📅 Hari ini            (RN)(BS)│  ← due (warning=hari ini, danger=terlambat), assignee
└────────────────────────────────┘
```
- Tugas selesai: judul dicoret + opacity 70%.
- Jika terhubung ke deal/kontak: baris kecil `🔗 Pengadaan Laptop Q4`.

### 4.3 Kolom Kanban
```
┌─ Proposal ─────────── 8 ─ ⋯ ┐   ← nama (h3), jumlah, menu kolom
│ Rp 840 jt · tertimbang 420 jt│   ← (Pipeline) total & weighted
│ ████████░░ 50%              │   ← probabilitas tahap (pipeline saja)
├─────────────────────────────┤
│ [kartu]                     │
│ [kartu]                     │   scroll vertikal mandiri
│ … Muat lebih banyak         │
├─────────────────────────────┤
│ + Tambah                    │   ← quick-add (input inline, Enter simpan)
└─────────────────────────────┘
```
- Lebar 280–300 px, latar `surface`, radius `lg`, gap antar kolom 12 px, board scroll horizontal.
- WIP terlampaui: header berlatar `warning` 10% + teks "5/4".
- Kolom "Done"/Won: ikon ✓ hijau di header. Kolom Lost: ikon ✕ merah.
- Saat kartu di-drag melewati kolom: latar kolom berubah ke `primary` 5% + border `primary` putus-putus.

### 4.4 Komponen Lain
| Komponen | Spesifikasi |
|----------|-------------|
| **Button** | Varian: primary, secondary (outline), ghost, destructive. Tinggi 36 px (default), 32 px (sm). Ikon 16 px. |
| **Input / Select / Combobox** | Tinggi 36 px, radius `sm`, fokus ring 2 px `primary`. Combobox untuk pilih kontak/perusahaan dengan opsi "+ Buat baru". |
| **Badge** | Soft style, `caption`, radius `sm`, tinggi 20 px. |
| **Avatar** | 24 px (kartu), 32 px (topbar), inisial di atas warna turunan dari nama; grup avatar menumpuk maks 3 + "+n". |
| **Drawer (detail deal/kontak)** | Dari kanan, 480 px (desktop), full-screen di ponsel; header sticky dengan judul + aksi; tab di bawahnya. |
| **Modal (detail tugas)** | 720 px, dua kolom: kiri konten (deskripsi, checklist, komentar), kanan properti (kolom, assignee, due, prioritas, label, relasi). |
| **Tabel data** | Header sticky, baris 44 px, hover `surface`, checkbox seleksi, toolbar aksi massal muncul saat ada yang dipilih. |
| **Timeline aktivitas** | Ikon per tipe dalam lingkaran 28 px, garis vertikal penghubung, penulis + waktu relatif ("2 jam lalu", tooltip tanggal lengkap). Aktivitas SYSTEM teks `muted`. |
| **Command palette** | shadcn `Command`, dibuka `Ctrl/Cmd+K`, hasil dikelompokkan (Kontak, Perusahaan, Deal, Tugas, Aksi cepat). |
| **Toast** | Kanan bawah, 4 detik; aksi "Urungkan" untuk hapus/pindah. |
| **Stat card** | Label `small muted`, angka `display`, delta vs periode lalu (hijau/merah dengan panah). |

## 5. Halaman & Wireframe

### 5.1 Login
```
            ┌───────────────────────────┐
            │        ◆ NamaCRM          │
            │  Masuk ke akun Anda       │
            │  Email    [____________]  │
            │  Password [____________]  │
            │  [        Masuk         ] │
            │  Lupa password?           │
            └───────────────────────────┘
```

### 5.2 Dashboard
```
Dashboard                                   Periode: [Bulan ini ▾] [Semua ▾]
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│Pipeline buka ││Tertimbang    ││Won bulan ini ││Win rate 90h  │
│Rp 2,4 M      ││Rp 1,1 M      ││12 · Rp 640 jt││ 34% ▲ 4%     │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
┌─ Funnel per tahap ───────────────────┐┌─ Tugas saya hari ini ─────┐
│ Lead        ████████████ 42          ││ ☐ Telepon PT Maju   10:00 │
│ Qualified   ████████ 28              ││ ☐ Kirim proposal ABC      │
│ Proposal    █████ 15                 ││ ⚠ 2 terlambat →           │
│ Negotiation ███ 8                    │└───────────────────────────┘
└──────────────────────────────────────┘
┌─ Won vs Lost (6 bulan) ──────────────┐┌─ Alasan Lost teratas ─────┐
│  ▇▅ ▇▃ ▆▄ ▇▂ ▇▅ ▇▃                  ││ Harga ████ 9              │
└──────────────────────────────────────┘│ Kompetitor ██ 5           │
┌─ Kinerja tim (Manager/Admin) ─────────┴───────────────────────────┐
│ Sales     Deal buka   Won   Nilai Won     Tugas terlambat         │
│ Budi S.   14          4     Rp 210 jt     1                       │
└───────────────────────────────────────────────────────────────────┘
```

### 5.3 Kontak — Daftar
```
Kontak  (1.284)                          [⇩ Import] [⇧ Export] [+ Kontak]
[🔍 Cari nama, email, telepon]  [Status ▾] [Owner ▾] [Tag ▾] [Sumber ▾]  ✕ Reset
┌──┬─────────────────┬──────────────┬──────────────┬──────────┬────────┬─────────┐
│☐ │ Nama            │ Perusahaan   │ Telepon      │ Status   │ Owner  │ Terakhir│
├──┼─────────────────┼──────────────┼──────────────┼──────────┼────────┼─────────┤
│☐ │ Andi Saputra    │ PT Maju Jaya │ +62812…      │ Prospect │ (BS)   │ 2 hr    │
└──┴─────────────────┴──────────────┴──────────────┴──────────┴────────┴─────────┘
                                                   ‹ 1 2 3 … 52 ›   25 / hal ▾
```

### 5.4 Kontak — Detail
```
← Kontak
(AS) Andi Saputra   [Prospect]  #vip                [Catat aktivitas] [+ Deal] [⋯]
     Purchasing Manager · PT Maju Jaya · andi@maju.co · +62812…   Owner: Budi S.
┌─ Tab: Timeline | Deal (2) | Tugas (3) | Info ─────────────┐┌─ Ringkasan ─────────┐
│ [Catat: Catatan|Telepon|Meeting]  [Tulis catatan…   ]    ││ Sumber: Referral    │
│ ● Telepon · Budi · 2 jam lalu                            ││ Dibuat: 3 Okt 2026  │
│   Minta penawaran 20 unit                                ││ Deal terbuka:       │
│ ○ Sistem · Deal pindah Lead → Qualified · kemarin        ││  Rp 125 jt          │
└──────────────────────────────────────────────────────────┘└─────────────────────┘
```

### 5.5 Perusahaan — Detail
Struktur sama dengan detail kontak; tab: **Kontak | Deal | Timeline | Info**, panel ringkasan menampilkan jumlah kontak dan total nilai deal terbuka/won.

### 5.6 Pipeline Deal (Kanban)
```
Pipeline Penjualan   [🔍] [Owner ▾] [Prioritas ▾] [Closing ▾]  [▦ Kanban | ☰ Tabel]  [+ Deal]
┌─ Lead ──── 42 ┐┌─ Qualified ─ 28 ┐┌─ Proposal ── 15 ┐┌─ Negotiation 8 ┐┌─ Won ✓ ┐┌─ Lost ✕ ┐
│ Rp 610 jt     ││ Rp 980 jt       ││ Rp 840 jt       ││ Rp 520 jt      ││ drop   ││ drop    │
│ ┌───────────┐ ││ ┌─────────────┐ ││ ┌─────────────┐ ││ ┌────────────┐ ││ di sini││ di sini │
│ │ kartu deal│ ││ │ kartu deal  │ ││ │ kartu deal  │ ││ │ kartu deal │ ││        ││         │
│ └───────────┘ ││ └─────────────┘ ││ └─────────────┘ ││ └────────────┘ ││        ││         │
│ + Tambah      ││ + Tambah        ││ + Tambah        ││ + Tambah       ││        ││         │
└───────────────┘└─────────────────┘└─────────────────┘└────────────────┘└────────┘└─────────┘
```
- Kolom **Won** dan **Lost** tampil ramping (120 px) sebagai zona drop, tidak menampilkan kartu (deal tertutup dilihat via filter "Tertutup").
- Drop ke **Lost** → modal:
```
┌─ Tandai deal sebagai Lost ─────────────┐
│ Alasan *  [Harga terlalu tinggi    ▾]  │
│ Catatan   [______________________]     │
│              [Batal]  [Tandai Lost]    │
└────────────────────────────────────────┘
```
- Drop ke **Won** → konfeti ringan (dimatikan bila reduced-motion) + toast "Deal Won 🎉 Rp 125 jt".

### 5.7 Task Board (Kanban)
```
Board: Marketing Q4  (RN)(BS)(SA)+2  [+ Anggota]   [🔍] [Assignee ▾] [Label ▾] [Due ▾]   [⋯ Atur kolom]
┌─ To Do ──── 6 ┐┌─ In Progress 3/4┐┌─ Review ─── 2 ┐┌─ Done ✓ ─ 14 ┐┌ + Kolom ┐
│ [kartu tugas] ││ [kartu tugas]   ││ [kartu tugas] ││ [kartu ✓]    ││         │
│ [kartu tugas] ││                 ││               ││              ││         │
│ + Tambah tugas││ + Tambah tugas  ││ + Tambah tugas││              ││         │
└───────────────┘└─────────────────┘└───────────────┘└──────────────┘└─────────┘
```
Modal detail tugas:
```
┌─ Siapkan materi presentasi klien ────────────────────────────── ✕ ┐
│ Deskripsi                                  │ Kolom     [In Progress▾]│
│ [markdown editor…]                         │ Assignee  (RN)(BS) [+]  │
│ Checklist  3/5  ███████░░░                 │ Due       📅 1 Nov 2026 │
│ ☑ Outline  ☑ Data  ☑ Desain  ☐ Review ☐ Kirim│ Prioritas [Urgent ▾]  │
│ + Item                                     │ Label     [Desain] [+]  │
│ Komentar                                   │ Terkait   🔗 Deal ABC   │
│ (BS) Sudah aku update slide 4 @Rina        │ Lampiran  📎 brief.pdf  │
│ [Tulis komentar… @mention]      [Kirim]    │ [Arsipkan] [Hapus]      │
└────────────────────────────────────────────┴─────────────────────────┘
```

### 5.8 Tugas Saya
```
Tugas Saya                                      [Semua board ▾]  [+ Tugas]
⚠ Terlambat (2)
  ☐ Follow-up PT ABC          Follow-up Sales   📅 29 Okt   ● High
Hari ini (3)
  ☐ Telepon PT Maju           Follow-up Sales   📅 10:00    ● Medium
7 hari ke depan (5)
  ☐ Siapkan materi presentasi Marketing Q4      📅 Sen 3 Nov
Tanpa tanggal (4)
```
Centang = selesai (pindah ke kolom Done) dengan toast "Urungkan".

### 5.9 Pengaturan
Tata letak dua kolom: menu kiri (Umum, Pengguna, Tahap Pipeline, Alasan Lost, Board, Tag & Label, Sumber Lead, Audit Log) dan konten kanan.
```
Tahap Pipeline
 ⋮⋮ Lead          [10%]  Macet setelah [14] hari   🗑
 ⋮⋮ Qualified     [25%]                 [14]       🗑
 ⋮⋮ Proposal      [50%]                 [10]       🗑
 ⋮⋮ Negotiation   [75%]                 [7]        🗑
    Won ✓  (100%, terkunci)   Lost ✕ (0%, terkunci)
 [+ Tahap]                                   [Simpan]
```

## 6. State Halaman
| State | Perlakuan |
|-------|-----------|
| **Kosong** | Ilustrasi garis sederhana + kalimat ajakan + tombol aksi (mis. "Belum ada kontak. Tambahkan kontak pertama atau impor dari CSV."). |
| **Loading** | Skeleton sesuai bentuk (baris tabel, kartu Kanban); tanpa spinner layar penuh. |
| **Error** | Banner inline dengan pesan jelas + tombol "Coba lagi". Error form ditampilkan di bawah field. |
| **Gagal simpan drag** | Kartu kembali ke posisi semula + toast danger "Gagal memindahkan, coba lagi". |
| **Tanpa akses** | Halaman 403 ramah: "Anda tidak memiliki akses ke halaman ini." |
| **Offline** | Banner kuning di atas: "Koneksi terputus — perubahan belum tersimpan." |

## 7. Interaksi Drag & Drop
- Aktivasi drag: mouse setelah bergerak 5 px; sentuh setelah tekan 200 ms (agar scroll tetap bisa).
- Auto-scroll horizontal saat kartu didekatkan ke tepi board.
- **Keyboard:** fokus kartu → `Space` angkat → `←/→` pindah kolom, `↑/↓` pindah urutan → `Space` jatuhkan, `Esc` batal. Pengumuman screen reader via live region dnd-kit dalam Bahasa Indonesia ("Kartu Pengadaan Laptop dipindah ke kolom Proposal, posisi 2 dari 8").
- Menu alternatif tanpa drag: "Pindah ke…" di menu kartu (penting untuk ponsel & aksesibilitas).

## 8. Responsif (Ponsel)
- Sidebar → tombol menu (sheet) + bottom nav 4 item (Dashboard, Kontak, Pipeline, Tugas).
- Kanban: satu kolom selebar layar, swipe horizontal dengan scroll-snap, indikator titik kolom di atas; nama kolom sticky.
- Drawer & modal menjadi full-screen.
- Tabel kontak menjadi list kartu (nama, perusahaan, status, tombol telepon/WA).
- Target sentuh minimal 44×44 px.

## 9. Aksesibilitas
- Kontras WCAG 2.1 AA; status tidak hanya dibedakan warna (ada ikon/teks).
- Fokus terlihat (ring 2 px `primary`) di semua elemen interaktif.
- Semua ikon-tombol punya `aria-label`; modal/drawer memerangkap fokus dan kembali ke pemicu saat ditutup.
- Formulir: label eksplisit, pesan error terhubung via `aria-describedby`.

## 10. Bahasa & Format
- Bahasa antarmuka: Indonesia, kalimat singkat dan aktif ("Simpan", "Tambah kontak", bukan "Submit").
- Mata uang: `Rp 125.000.000`; ringkas di kolom/dashboard: `Rp 125 jt`, `Rp 2,4 M`.
- Tanggal: `31 Okt 2026`; waktu 24 jam `14:30`; relatif untuk < 7 hari ("2 jam lalu", "kemarin").
- Telepon ditampilkan `+62 812-3456-7890`.

## 11. Pemetaan Halaman → Requirement
| Halaman | FR |
|---------|----|
| Login, Undangan, Lupa password | FR-AUTH-01..04 |
| Dashboard | FR-DASH-01..07 |
| Kontak (daftar, detail) | FR-CON-01..08, FR-ACT-01..04, FR-SRCH-02 |
| Perusahaan (daftar, detail) | FR-COM-01..04 |
| Pipeline Kanban + drawer deal + modal Lost | FR-DEAL-01..10 |
| Task Board + modal tugas | FR-TASK-01..12, FR-TASK-14 |
| Tugas Saya | FR-TASK-13 |
| Lonceng notifikasi | FR-NOTIF-01..06 |
| Command palette | FR-SRCH-01 |
| Wizard Import / tombol Export | FR-IO-01..04 |
| Pengaturan | FR-SET-01..06, FR-AUTH-05..06 |
