# Dokumentasi Perencanaan — CRM + Kanban (Internal)

Dokumen ini adalah fondasi sebelum pengembangan aplikasi CRM + Kanban untuk tim internal.
Bacalah berurutan: dari **kenapa** (bisnis) → **apa** (produk & fungsi) → **bagaimana** (teknis & desain).

| # | Dokumen | Isi | Pembaca utama |
|---|---------|-----|---------------|
| 1 | [BRD.md](BRD.md) | Business Requirements: masalah, tujuan, KPI, ruang lingkup | Owner, manajemen |
| 2 | [PRD.md](PRD.md) | Product Requirements: persona, fitur, user story, roadmap | Product owner, tim |
| 3 | [FRD.md](FRD.md) | Functional Requirements: perilaku detail tiap modul, aturan, RBAC | Developer, QA |
| 4 | [TRD.md](TRD.md) | Technical Requirements: arsitektur, skema data, API, keamanan, deploy | Developer |
| 5 | [DESIGN.md](DESIGN.md) | Design system, komponen, wireframe halaman | Designer, frontend |

## Ringkasan Keputusan

- **Pengguna:** tim internal satu organisasi (single-tenant).
- **MVP:** Kontak & Perusahaan, Pipeline Deal (Kanban), Task Board (Kanban), Dashboard.
- **Pipeline:** satu pipeline, satu board bersama untuk seluruh tim (semua pengguna boleh menggeser & mengubah deal siapa pun).
- **Login:** email & password saja (tanpa Google).
- **Stack:** Next.js (App Router, TypeScript) + Prisma + PostgreSQL + Auth.js.
- **Fase 2:** integrasi WhatsApp & Email, otomasi, laporan lanjutan.

## Keterlacakan ID

```
BR-xx (BRD)  →  US-xx (PRD)  →  FR-xxx-xx (FRD)  →  TR-xx (TRD) / halaman (DESIGN)
```

Setiap requirement di dokumen yang lebih teknis merujuk balik ke ID di dokumen sebelumnya.
