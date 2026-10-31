import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { NotFoundError } from "@/server/action-utils";
import type { CurrentUser } from "@/server/session";
import { normalizePhone } from "@/lib/phone";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

export const createContactSchema = z
  .object({
    firstName: z.string().trim().min(1, "Nama depan wajib diisi").max(100),
    lastName: optionalText,
    email: z
      .union([z.literal(""), z.email("Format email tidak valid")])
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null)),
    phone: optionalText.transform((v) => normalizePhone(v)),
    jobTitle: optionalText,
    companyId: optionalText,
    source: optionalText,
    status: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]).default("LEAD"),
    allowDuplicate: z.string().optional(),
  })
  .refine((d) => d.email || d.phone, { message: "Isi email atau telepon", path: ["email"] });

export const createActivitySchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(["NOTE", "CALL", "MEETING", "EMAIL", "WHATSAPP", "OTHER"]),
  body: z.string().trim().min(1, "Isi catatan").max(5000),
});

export type DuplicateHit = { id: string; name: string };

/** FR-CON-02: cari kontak lain dengan email atau telepon yang sama. */
async function findDuplicate(email: string | null, phone: string | null): Promise<DuplicateHit | null> {
  const or = [email && { email }, phone && { phone }].filter(Boolean) as { email?: string; phone?: string }[];
  if (!or.length) return null;
  const hit = await db.contact.findFirst({ where: { deletedAt: null, OR: or }, select: { id: true, firstName: true, lastName: true } });
  return hit ? { id: hit.id, name: [hit.firstName, hit.lastName].filter(Boolean).join(" ") } : null;
}

export async function createContact(user: CurrentUser, input: Record<string, string>) {
  const { allowDuplicate, ...data } = createContactSchema.parse(input);
  if (!allowDuplicate) {
    const duplicate = await findDuplicate(data.email, data.phone);
    if (duplicate) return { duplicate };
  }
  const contact = await db.contact.create({ data: { ...data, ownerId: user.id } });
  await db.activity.create({
    data: { type: "SYSTEM", body: `Kontak dibuat oleh ${user.name}`, contactId: contact.id, companyId: contact.companyId },
  });
  return { contact };
}

export async function createActivity(user: CurrentUser, input: Record<string, string>) {
  const data = createActivitySchema.parse(input);
  const contact = await db.contact.findFirst({ where: { id: data.contactId, deletedAt: null } });
  if (!contact) throw new NotFoundError("Kontak tidak ditemukan.");
  // Semua pengguna boleh mencatat aktivitas pada kontak mana pun (riwayat tim bersama).
  return db.activity.create({
    data: { type: data.type, body: data.body, authorId: user.id, contactId: contact.id, companyId: contact.companyId },
  });
}
