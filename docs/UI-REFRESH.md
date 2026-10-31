# CRM UI refresh

Tanggal: 31 Oktober 2026. Dokumen ini memperbarui arahan visual dalam DESIGN.md.

## Arah implementasi

CRM internal dengan layout tenang dan padat informasi: Inter lokal, latar netral,
kartu putih, sidebar charcoal, aksen teal. Radius 8–16 px, border halus,
angka tabular, serta ikon Lucide. Dark mode mengikuti pengaturan sistem.
Pilihan teal adalah keputusan desain proyek; bukan hasil palet otomatis.

Komponen bersama mengikuti pola shadcn/ui (CVA, cn, semantic tokens, data-slot)
dengan API lama tetap kompatibel. `components.json` menyediakan registry Kokonut UI.
Loader resmi Kokonut digunakan pada loading route, diadaptasi ke semantic tokens
dan preferensi reduced motion. Tidak ada perubahan skema database atau izin akses.

## Referensi yang diterapkan

- [shadcn/ui theming](https://ui.shadcn.com/docs/theming): semantic tokens dan
  komponen yang dimiliki proyek. Kontrol sederhana tetap memakai elemen HTML native.
- [Kokonut UI](https://kokonutui.com/docs): detail visual dan komponen loader
  dari https://kokonutui.com/r/loader.json (MIT).
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill):
  pencarian `CRM dashboard enterprise minimal` menghasilkan Flat Design dan
  Inter/Inter. Pencarian `internal sales dashboard` menghasilkan Minimalism.
  Saran struktur landing page tidak relevan dan tidak diterapkan.
  Panduan stack Next.js dipakai untuk navigasi Link.

## Cakupan

- Sidebar desktop dan drawer navigasi tablet/ponsel, breadcrumb, pencarian kontak.
- Dashboard: metrik data asli, distribusi pipeline, tautan detail tugas, kinerja tim.
- Tampilan login, toggle visibilitas kata sandi, feedback proses/error.
- Form, tombol, badge, tabel, empty state, dialog, kartu board, dan kolom Kanban.
- Tugas jatuh tempo hari ini tidak ditandai terlambat sebelum hari tersebut berakhir,
  sesuai pengelompokan pada halaman Tugas Saya.

## Pedoman lanjutan

Jangan tampilkan statistik, tren, notifikasi, atau tombol dekoratif yang tidak
terhubung fungsi nyata. Pertahankan tampilan kosong yang jujur. Gunakan navigasi
keyboard, label kontrol, target sentuh 44 px untuk aksi utama, dan reduced motion.
Tabel dan Kanban boleh menggulir di dalam kontainernya, bukan seluruh halaman.

## Verifikasi

Jalankan `npm run lint`, `npm run typecheck`, dan `npm run build`.
Periksa halaman login, dashboard, kontak, pipeline, dan drawer navigasi pada
lebar ponsel serta desktop; periksa juga mode gelap dan navigasi keyboard.

Hasil verifikasi implementasi: lint, typecheck, build produksi, dan diff check
lulus. Chrome headless memeriksa login, dashboard, kontak, perusahaan, pipeline,
board, tugas, dan pengaturan. Lebar 390, 768, dan 1440 px yang diuji tidak
mengalami overflow horizontal halaman. Pencarian/empty state, toggle kata sandi,
navigasi ponsel, penutupan dengan Escape, modal deal di ponsel, serta mode gelap
berfungsi dalam pengujian; tidak ada page error JavaScript. Pemeriksaan halaman
internal memakai sesi uji sementara dengan data lokal yang sudah ada, tanpa
menyimpan perubahan bisnis. Alur simpan dan drag-and-drop tidak diuji ulang.
