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
