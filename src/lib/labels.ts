import type { Tone } from "@/components/ui/misc";

export const contactStatus = {
  LEAD: { label: "Lead", tone: "slate" },
  PROSPECT: { label: "Prospect", tone: "sky" },
  CUSTOMER: { label: "Customer", tone: "green" },
  INACTIVE: { label: "Inactive", tone: "zinc" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const activityType = {
  NOTE: "Catatan",
  CALL: "Telepon",
  MEETING: "Meeting",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  OTHER: "Lainnya",
  SYSTEM: "Sistem",
} as const;

export const roleLabel = {
  ADMIN: { label: "Admin", tone: "indigo", description: "Akses penuh, termasuk kelola pengguna & pengaturan" },
  MANAGER: { label: "Manager", tone: "sky", description: "Kelola semua data CRM, pipeline & board; tidak kelola pengguna" },
  MEMBER: { label: "Member", tone: "slate", description: "Kelola kontak sendiri, ubah & geser deal, kerjakan tugas" },
} as const satisfies Record<string, { label: string; tone: Tone; description: string }>;
