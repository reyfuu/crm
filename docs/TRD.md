# Technical Requirements Document (TRD)
**Produk:** CRM + Kanban Internal
**Versi:** 1.0 · **Tanggal:** 31 Oktober 2026 · **Referensi:** [PRD.md](PRD.md), [FRD.md](FRD.md), [DESIGN.md](DESIGN.md)

---

## 1. Ringkasan Teknis
Aplikasi web monolit berbasis **Next.js (App Router, TypeScript)** dengan **Prisma ORM** dan **PostgreSQL**. Rendering server-first (React Server Components) untuk halaman data, Client Components untuk interaksi Kanban. Mutasi data melalui **Server Actions** (dipanggil dari UI) dan **Route Handlers** (`/api/*`) untuk kebutuhan seperti import file, export, dan polling notifikasi.

## 2. Tech Stack
| Lapisan | Teknologi | Alasan |
|---------|-----------|--------|
| Framework | Next.js 15+ (App Router), React 19, TypeScript (strict) | Full-stack dalam satu repo, SSR, Server Actions |
| Database | PostgreSQL 16 | Relasional, andal, full-text search (`pg_trgm`) |
| ORM | Prisma | Type-safe, migrasi terkelola |
| Autentikasi | Auth.js (NextAuth v5) — Credentials provider (email & password saja), sesi JWT | Standar ekosistem Next.js |
| Hash password | argon2 (atau bcrypt cost 12) | Keamanan |
| Validasi | Zod (dipakai bersama di client & server) | Satu skema untuk form & API |
| Form | React Hook Form + `@hookform/resolvers/zod` | Performa & DX |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react | Konsisten dengan [DESIGN.md](DESIGN.md), aksesibel |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Ringan, mendukung keyboard & touch |
| Data fetching client | TanStack Query | Cache, optimistic update, polling |
| Tabel | TanStack Table | Sort, seleksi, kolom dinamis |
| Grafik | Recharts | Dashboard |
| Tanggal | date-fns (+ locale `id`) | Ringan |
| CSV | Papa Parse | Import/export |
| Email | Nodemailer (SMTP) atau Resend | Undangan, reset password, digest |
| Penyimpanan file | S3-compatible (MinIO / Cloudflare R2) | Lampiran tugas, logo |
| Job terjadwal | Cron (Vercel Cron atau `node-cron` di container) | Notifikasi jatuh tempo, tandai deal macet |
| Testing | Vitest, Testing Library, Playwright | Unit, komponen, E2E |
| Kualitas kode | ESLint, Prettier, Husky + lint-staged | Konsistensi |
| Monitoring | Sentry, log terstruktur (pino) | Error tracking |

## 3. Arsitektur

```mermaid
flowchart LR
  B[Browser<br/>React Client Components<br/>TanStack Query + dnd-kit] -->|HTTPS| N[Next.js Server]
  subgraph N[Next.js App]
    RSC[Server Components<br/>halaman & data awal]
    SA[Server Actions<br/>mutasi]
    RH[Route Handlers /api<br/>import, export, notif]
    SVC[Service layer<br/>aturan bisnis + RBAC]
    RSC --> SVC
    SA --> SVC
    RH --> SVC
  end
  SVC --> P[(Prisma Client)]
  P --> DB[(PostgreSQL)]
  RH --> S3[(Object Storage)]
  CRON[Cron Job] --> RH
  SVC --> MAIL[SMTP / Email API]
```

### 3.1 Prinsip Lapisan
1. **UI (app/, components/)** — tidak pernah memanggil Prisma langsung.
2. **Actions / Route Handlers** — tipis: autentikasi sesi, validasi Zod, panggil service, `revalidatePath`.
3. **Service layer (`src/server/services`)** — seluruh aturan bisnis (BRL-*) dan pengecekan RBAC.
4. **Data layer (`src/server/db`)** — Prisma client singleton, helper query.

### 3.2 Alur Drag & Drop (Optimistic Update)
```mermaid
sequenceDiagram
  participant U as User
  participant C as Client (dnd-kit + TanStack Query)
  participant S as Server Action moveDeal
  participant D as DB
  U->>C: drop kartu ke tahap baru
  C->>C: hitung position baru, update cache (optimistic)
  C->>S: moveDeal({dealId, toStageId, position, version})
  S->>S: cek sesi, RBAC, aturan (Lost butuh alasan)
  S->>D: transaksi: update deal + insert DealStageHistory + Activity
  D-->>S: ok
  S-->>C: deal terbaru
  alt gagal
    C->>C: rollback cache + toast error
  end
```

## 4. Model Data

### 4.1 ERD
```mermaid
erDiagram
  User ||--o{ Contact : owns
  User ||--o{ Company : owns
  User ||--o{ Deal : owns
  Company ||--o{ Contact : has
  Company ||--o{ Deal : has
  Contact ||--o{ Deal : "primary contact"
  Stage ||--o{ Deal : contains
  Deal ||--o{ DealStageHistory : logs
  Board ||--o{ BoardColumn : has
  Board ||--o{ BoardMember : has
  User ||--o{ BoardMember : joins
  BoardColumn ||--o{ Task : contains
  Task ||--o{ TaskAssignee : has
  Task ||--o{ ChecklistItem : has
  Task ||--o{ Comment : has
  Task }o--o| Deal : "related"
  Task }o--o| Contact : "related"
  Activity }o--o| Contact : about
  Activity }o--o| Company : about
  Activity }o--o| Deal : about
  User ||--o{ Notification : receives
```

### 4.2 Skema Prisma (inti)
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role          { ADMIN MANAGER MEMBER }
enum ContactStatus { LEAD PROSPECT CUSTOMER INACTIVE }
enum StageType     { OPEN WON LOST }
enum DealStatus    { OPEN WON LOST }
enum Priority      { LOW MEDIUM HIGH URGENT }
enum ActivityType  { NOTE CALL MEETING EMAIL WHATSAPP OTHER SYSTEM }

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String?
  role         Role      @default(MEMBER)
  avatarUrl    String?
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  contacts      Contact[]      @relation("ContactOwner")
  companies     Company[]      @relation("CompanyOwner")
  deals         Deal[]         @relation("DealOwner")
  boardMembers  BoardMember[]
  assignments   TaskAssignee[]
  notifications Notification[]
}

model Company {
  id        String    @id @default(cuid())
  name      String
  domain    String?
  industry  String?
  size      String?
  phone     String?
  address   String?
  city      String?
  ownerId   String
  owner     User      @relation("CompanyOwner", fields: [ownerId], references: [id])
  contacts  Contact[]
  deals     Deal[]
  tags      Tag[]
  activities Activity[]
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@index([name])
  @@index([ownerId])
}

model Contact {
  id         String        @id @default(cuid())
  firstName  String
  lastName   String?
  email      String?
  phone      String?       // dinormalisasi E.164 (+62...)
  jobTitle   String?
  status     ContactStatus @default(LEAD)
  source     String?
  address    String?
  companyId  String?
  company    Company?      @relation(fields: [companyId], references: [id])
  ownerId    String
  owner      User          @relation("ContactOwner", fields: [ownerId], references: [id])
  tags       Tag[]
  deals      Deal[]
  tasks      Task[]
  activities Activity[]
  deletedAt  DateTime?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  @@index([email])
  @@index([phone])
  @@index([ownerId, status])
  @@index([companyId])
}

// Hanya ada SATU pipeline penjualan, jadi tidak ada tabel Pipeline:
// tahap (Stage) langsung menjadi kolom board pipeline bersama.
model Stage {
  id          String    @id @default(cuid())
  name        String
  type        StageType @default(OPEN)
  probability Int       @default(0)   // 0..100
  rottingDays Int       @default(14)
  position    Float
  deals       Deal[]
  @@index([position])
}

model Deal {
  id                String     @id @default(cuid())
  title             String
  value             Decimal    @default(0) @db.Decimal(18, 2)
  currency          String     @default("IDR")
  status            DealStatus @default(OPEN)
  priority          Priority   @default(MEDIUM)
  expectedCloseDate DateTime?
  closedAt          DateTime?
  lostReason        String?
  stageId           String
  stage             Stage      @relation(fields: [stageId], references: [id])
  stageEnteredAt    DateTime   @default(now())
  position          Float
  contactId         String?
  contact           Contact?   @relation(fields: [contactId], references: [id], onDelete: SetNull)
  companyId         String?
  company           Company?   @relation(fields: [companyId], references: [id], onDelete: SetNull)
  ownerId           String
  owner             User       @relation("DealOwner", fields: [ownerId], references: [id])
  tags              Tag[]
  history           DealStageHistory[]
  tasks             Task[]
  activities        Activity[]
  version           Int        @default(0)
  deletedAt         DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  @@index([stageId, position])
  @@index([ownerId, status])
}

model DealStageHistory {
  id          String   @id @default(cuid())
  dealId      String
  deal        Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  fromStageId String?
  toStageId   String
  changedById String
  changedAt   DateTime @default(now())
  @@index([dealId, changedAt])
}

model Board {
  id          String        @id @default(cuid())
  name        String
  description String?
  color       String?
  visibility  String        @default("ALL") // ALL | MEMBERS
  isArchived  Boolean       @default(false)
  isSystem    Boolean       @default(false) // board "Follow-up Sales"
  ownerId     String
  columns     BoardColumn[]
  members     BoardMember[]
  createdAt   DateTime      @default(now())
}

model BoardMember {
  boardId String
  userId  String
  board   Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user    User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([boardId, userId])
}

model BoardColumn {
  id       String  @id @default(cuid())
  boardId  String
  board    Board   @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name     String
  position Float
  isDone   Boolean @default(false)
  wipLimit Int?
  tasks    Task[]
  @@index([boardId, position])
}

model Task {
  id          String          @id @default(cuid())
  title       String
  description String?
  columnId    String
  column      BoardColumn     @relation(fields: [columnId], references: [id], onDelete: Cascade)
  position    Float
  priority    Priority        @default(MEDIUM)
  dueDate     DateTime?
  completedAt DateTime?
  isArchived  Boolean         @default(false)
  createdById String
  dealId      String?
  deal        Deal?           @relation(fields: [dealId], references: [id], onDelete: SetNull)
  contactId   String?
  contact     Contact?        @relation(fields: [contactId], references: [id], onDelete: SetNull)
  assignees   TaskAssignee[]
  checklist   ChecklistItem[]
  comments    Comment[]
  labels      Label[]
  attachments Attachment[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  @@index([columnId, position])
  @@index([dueDate])
}

model TaskAssignee {
  taskId String
  userId String
  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([taskId, userId])
  @@index([userId])
}

model ChecklistItem {
  id       String  @id @default(cuid())
  taskId   String
  task     Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  text     String
  isDone   Boolean @default(false)
  position Float
}

model Comment {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  authorId  String
  body      String
  mentions  String[] // userId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Attachment {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  fileName  String
  fileKey   String   // key di object storage
  mimeType  String
  size      Int
  uploadedBy String
  createdAt DateTime @default(now())
}

model Activity {
  id         String       @id @default(cuid())
  type       ActivityType
  body       String
  occurredAt DateTime     @default(now())
  authorId   String?      // null untuk SYSTEM
  contactId  String?
  contact    Contact?     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  companyId  String?
  company    Company?     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  dealId     String?
  deal       Deal?        @relation(fields: [dealId], references: [id], onDelete: Cascade)
  meta       Json?        // mis. {fromStage, toStage}
  createdAt  DateTime     @default(now())
  @@index([contactId, occurredAt])
  @@index([companyId, occurredAt])
  @@index([dealId, occurredAt])
}

model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  color     String
  contacts  Contact[]
  companies Company[]
  deals     Deal[]
}

model Label {
  id    String @id @default(cuid())
  name  String @unique
  color String
  tasks Task[]
}

model Notification {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String    // TASK_ASSIGNED | MENTION | TASK_DUE | OWNER_CHANGED | COMMENT
  title      String
  link       String
  readAt     DateTime?
  createdAt  DateTime  @default(now())
  @@index([userId, readAt])
}

model LostReason { id String @id @default(cuid()); name String @unique; position Float }
model LeadSource { id String @id @default(cuid()); name String @unique; position Float }
model Setting    { key String @id; value Json }

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String   // LOGIN, ROLE_CHANGED, DELETE, IMPORT, EXPORT, ...
  entity    String?
  entityId  String?
  meta      Json?
  ip        String?
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

### 4.3 Catatan Data
- **TR-01 Urutan kartu:** `position Float`. Posisi baru = rata-rata posisi kartu di atas & di bawahnya; kartu di akhir = posisi terakhir + 1024. Jika selisih dua posisi < 1e-6, kolom di-*rebalance* (posisi diatur ulang kelipatan 1024) dalam satu transaksi.
- **TR-02 Soft delete:** `deletedAt` pada Contact, Company, Deal. Semua query default memfilter `deletedAt IS NULL` (helper di data layer / Prisma client extension). Job harian menghapus permanen data > 30 hari.
- **TR-03 Pencarian:** ekstensi `pg_trgm` + indeks GIN pada `Contact(firstName, lastName, email, phone)`, `Company(name)`, `Deal(title)` via migrasi SQL manual.
- **TR-04 Uang:** `Decimal(18,2)`; tidak pernah memakai float untuk nilai uang. Serialisasi ke klien sebagai string.
- **TR-05 Waktu:** disimpan UTC (`timestamptz`), ditampilkan di zona waktu dari pengaturan (default Asia/Jakarta).
- **TR-06 Konkurensi:** `Deal.version` untuk optimistic locking pada edit form; untuk drag & drop berlaku last-write-wins (BRL-DEAL-4).
- **Seed awal:** 1 Admin, tahap pipeline (Lead 10% → Qualified 25% → Proposal 50% → Negotiation 75% → Won 100% → Lost 0%), board sistem "Follow-up Sales" (To Do, In Progress, Done), alasan Lost default (Harga, Kompetitor, Tidak ada budget, Tidak responsif, Timing), sumber lead default.

## 5. Desain API

Semua mutasi melalui Server Actions yang mengembalikan bentuk seragam:
```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "INTERNAL"; message: string; fields?: Record<string, string> } };
```

### 5.1 Server Actions
| Modul | Action | FR |
|-------|--------|----|
| Auth/User | `inviteUser`, `updateUserRole`, `deactivateUser`, `updateProfile`, `changePassword` | FR-AUTH-05..07 |
| Contact | `createContact`, `updateContact`, `deleteContact`, `restoreContact`, `mergeContacts`, `bulkUpdateContacts` | FR-CON-* |
| Company | `createCompany`, `updateCompany`, `deleteCompany` | FR-COM-* |
| Activity | `createActivity`, `updateActivity`, `deleteActivity` | FR-ACT-* |
| Deal | `createDeal`, `updateDeal`, `moveDeal`, `markDealWon`, `markDealLost`, `reopenDeal`, `deleteDeal` | FR-DEAL-* |
| Board | `createBoard`, `updateBoard`, `archiveBoard`, `addBoardMember`, `removeBoardMember` | FR-TASK-01, 03 |
| Column | `createColumn`, `updateColumn`, `moveColumn`, `deleteColumn` | FR-TASK-02 |
| Task | `createTask`, `updateTask`, `moveTask`, `toggleTaskComplete`, `archiveTask`, `setAssignees` | FR-TASK-04..05, 13 |
| Checklist | `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem` | FR-TASK-07 |
| Comment | `createComment`, `updateComment`, `deleteComment` | FR-TASK-08 |
| Settings | `upsertStage`, `reorderStages`, `deleteStage`, `upsertLostReason`, `upsertTag`, `updateSettings` | FR-SET-* |
| Notification | `markNotificationRead`, `markAllNotificationsRead` | FR-NOTIF |

### 5.2 Route Handlers
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET/POST | `/api/auth/[...nextauth]` | Auth.js |
| GET | `/api/search?q=` | Pencarian global (FR-SRCH-01) |
| GET | `/api/boards/:id/columns/:colId/tasks?cursor=` | Muat kartu tambahan per kolom |
| GET | `/api/stages/:stageId/deals?cursor=` | Muat deal tambahan per tahap |
| GET | `/api/notifications?unread=1` | Polling notifikasi (tiap 30 detik) |
| POST | `/api/import/:entity/preview` | Parse & validasi CSV (FR-IO-01) |
| POST | `/api/import/:entity/commit` | Simpan hasil import (batch 500 baris/transaksi) |
| GET | `/api/export/:entity?<filter>` | Stream CSV (FR-IO-03) |
| POST | `/api/uploads/presign` | URL unggah lampiran ke object storage |
| POST | `/api/cron/due-tasks` | Notifikasi tugas jatuh tempo (dilindungi `CRON_SECRET`) |
| POST | `/api/cron/cleanup` | Hapus permanen soft-delete > 30 hari, rebalance posisi |

## 6. Keamanan
| ID | Kebutuhan |
|----|-----------|
| TR-SEC-01 | Semua rute di bawah `/(app)` dilindungi middleware Auth.js; tanpa sesi → redirect `/login`. |
| TR-SEC-02 | RBAC dicek di service layer untuk **setiap** mutasi & query (tidak mengandalkan UI). Helper `assertCan(user, action, resource)`. |
| TR-SEC-03 | Password di-hash argon2id; token reset/undangan disimpan dalam bentuk hash, sekali pakai, berkedaluwarsa. |
| TR-SEC-04 | Rate limit login (5/15 menit) dan endpoint sensitif (import/export) — in-memory/Redis. |
| TR-SEC-05 | Server Actions memakai proteksi CSRF bawaan Next.js (origin check); cookie sesi `HttpOnly`, `Secure`, `SameSite=Lax`. |
| TR-SEC-06 | Semua input divalidasi Zod di server; output di-escape oleh React; markdown dirender dengan sanitasi. |
| TR-SEC-07 | Upload: whitelist MIME, maks 10 MB, nama file diacak, akses via signed URL berumur pendek. |
| TR-SEC-08 | Header keamanan: CSP, HSTS, X-Frame-Options DENY, Referrer-Policy. |
| TR-SEC-09 | Audit log untuk login, perubahan peran, hapus, import, export (FR-SET-06). |
| TR-SEC-10 | Secret hanya di environment variable; tidak pernah di repo. |

## 7. Performa & Skalabilitas
| ID | Target |
|----|--------|
| TR-PERF-01 | TTFB halaman < 500 ms, LCP < 2 s (data hingga 50.000 kontak). |
| TR-PERF-02 | Respons Server Action move kartu < 300 ms (p95); UI terasa instan via optimistic update. |
| TR-PERF-03 | Daftar memakai paginasi server-side; Kanban memuat 50 kartu pertama per kolom. |
| TR-PERF-04 | Agregasi dashboard memakai query `GROUP BY` terindeks; cache 60 detik (`unstable_cache` / tag revalidation). |
| TR-PERF-05 | Pencarian < 1 s via indeks trigram. |
| TR-PERF-06 | Connection pooling (PgBouncer / Prisma Accelerate) bila deploy serverless. |

## 8. Struktur Folder
```
crm/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, forgot-password, invite/[token]
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx              # sidebar + topbar
│  │  │  ├─ dashboard/
│  │  │  ├─ contacts/[id]/
│  │  │  ├─ companies/[id]/
│  │  │  ├─ deals/                  # pipeline kanban
│  │  │  ├─ boards/[boardId]/
│  │  │  ├─ my-tasks/
│  │  │  └─ settings/(general|users|stages|boards|tags|audit)
│  │  └─ api/...
│  ├─ components/
│  │  ├─ ui/                        # shadcn
│  │  ├─ kanban/                    # KanbanBoard, KanbanColumn, KanbanCard (generik)
│  │  ├─ deals/  contacts/  tasks/  layout/
│  ├─ server/
│  │  ├─ actions/                   # server actions per modul
│  │  ├─ services/                  # aturan bisnis + RBAC
│  │  ├─ db.ts                      # prisma singleton + extension soft-delete
│  │  ├─ auth.ts                    # konfigurasi Auth.js
│  │  └─ permissions.ts             # assertCan
│  ├─ lib/                          # utils, position.ts, phone.ts, format.ts
│  ├─ schemas/                      # skema Zod bersama
│  └─ hooks/
├─ tests/  (unit/, e2e/)
├─ .env.example
├─ docker-compose.yml               # postgres + minio untuk lokal
└─ Dockerfile
```

**Komponen Kanban generik** (`components/kanban`) dipakai bersama oleh Pipeline Deal dan Task Board; perbedaannya hanya pada render kartu dan action yang dipanggil.

## 9. Environment Variables
| Variabel | Keterangan |
|----------|-----------|
| `DATABASE_URL` | Koneksi PostgreSQL |
| `AUTH_SECRET` | Secret Auth.js |
| `AUTH_URL` | URL publik aplikasi |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Object storage |
| `CRON_SECRET` | Proteksi endpoint cron |
| `SENTRY_DSN` | Monitoring |

## 10. Deployment & Operasional
| Aspek | Rekomendasi |
|-------|------------|
| Opsi A (disarankan untuk internal) | VPS (2 vCPU / 4 GB) dengan Docker Compose: app Next.js (`output: "standalone"`), PostgreSQL, MinIO, reverse proxy Caddy (HTTPS otomatis) |
| Opsi B | Vercel + PostgreSQL terkelola (Neon/Supabase DB) + Cloudflare R2 |
| Lingkungan | `local` → `staging` → `production` |
| Migrasi | `prisma migrate deploy` dijalankan saat deploy |
| Backup | `pg_dump` harian, retensi 14 hari, disimpan di luar server; uji restore bulanan |
| Monitoring | Sentry (error), uptime check, log aplikasi |
| CI (GitHub Actions) | install → lint → typecheck → unit test → build → E2E (Playwright, Postgres service) → deploy ke staging; production via tag/manual approval |

## 11. Strategi Testing
| Jenis | Cakupan | Tools |
|-------|---------|-------|
| Unit | Service layer (aturan BRL-*, RBAC), util `position`, normalisasi telepon, parser CSV | Vitest |
| Integrasi | Server Actions dengan database test (Postgres di Docker) | Vitest |
| Komponen | Form, KanbanColumn, filter | Testing Library |
| E2E | Login, tambah kontak → buat deal → geser ke Won; Lost wajib alasan; buat tugas & pindah ke Done; Member bisa geser deal orang lain & owner menerima notifikasi; Member tidak bisa hapus deal | Playwright |
| Target | Coverage service layer ≥ 80% | — |

## 12. Persiapan Fase 2 (Integrasi WA & Email)
- Tabel `Activity` sudah memiliki tipe `EMAIL` dan `WHATSAPP` serta kolom `meta` (Json) untuk menyimpan `externalId`, arah pesan, dan status.
- Rencana: modul `integrations/` dengan webhook masuk (`/api/webhooks/whatsapp`, `/api/webhooks/email`), pencocokan pengirim ke kontak berdasarkan telepon/email ternormalisasi, dan antrean job (BullMQ + Redis) untuk pengiriman.

## 13. Pemetaan Requirement → Teknis
| FR | Komponen teknis |
|----|-----------------|
| FR-AUTH-* | `server/auth.ts`, middleware, `User`, `AuditLog`, TR-SEC-01..05 |
| FR-CON-*, FR-COM-* | `Contact`, `Company`, `Tag`, services contact/company, TR-02, TR-03 |
| FR-ACT-* | `Activity`, dibuat di service saat event (transaksi yang sama) |
| FR-DEAL-* | `Stage`, `Deal`, `DealStageHistory`, `components/kanban`, TR-01, TR-06 |
| FR-TASK-* | `Board`, `BoardColumn`, `BoardMember`, `Task`, `TaskAssignee`, `ChecklistItem`, `Comment`, `Attachment`, `Label` |
| FR-NOTIF-* | `Notification`, `/api/notifications`, `/api/cron/due-tasks` |
| FR-DASH-* | Query agregasi + Recharts, TR-PERF-04 |
| FR-SRCH-* | `/api/search`, TR-03 |
| FR-IO-* | `/api/import/*`, `/api/export/*`, Papa Parse |
| FR-SET-* | `Setting`, `LostReason`, `LeadSource`, `Stage`, `AuditLog` |
