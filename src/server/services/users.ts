import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { assertCan } from "@/server/permissions";
import { NotFoundError, ValidationError } from "@/server/action-utils";
import type { CurrentUser } from "@/server/session";
import { isPermission, overridesFor } from "@/lib/access";

// Kelola pengguna (FR-AUTH-05, 06, 08..10) & hak akses per pengguna (FR-AUTH-12). Hanya Admin.

const roleSchema = z.enum(["ADMIN", "MANAGER", "MEMBER"], { error: "Pilih peran." });
const nameSchema = z.string().trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter.");
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Format email tidak valid."));
const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(72, "Password maksimal 72 karakter.")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf.")
  .regex(/\d/, "Password harus mengandung angka.");

// Daftar hak yang dicentang di modal (hak efektif). Tidak dikirim = pakai default peran.
const permissionsSchema = z
  .array(z.string().refine(isPermission, "Hak akses tidak dikenal."))
  .max(50)
  .optional();

const createSchema = z.object({ name: nameSchema, email: emailSchema, role: roleSchema, password: passwordSchema, permissions: permissionsSchema });
const updateSchema = z.object({
  id: z.string().min(1),
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  isActive: z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean()),
  permissions: permissionsSchema,
});
const resetSchema = z.object({ id: z.string().min(1), password: passwordSchema });

async function assertEmailFree(email: string, exceptId?: string) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== exceptId) throw new ValidationError(`Email ${email} sudah dipakai pengguna lain.`);
}

/** Pastikan masih ada minimal satu Admin aktif selain `userId`. */
async function assertNotLastAdmin(userId: string) {
  const others = await db.user.count({ where: { role: "ADMIN", isActive: true, id: { not: userId } } });
  if (others === 0) throw new ValidationError("Ini Admin aktif terakhir. Jadikan pengguna lain Admin terlebih dahulu.");
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

async function getTarget(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("Pengguna tidak ditemukan.");
  return user;
}

export async function createUser(actor: CurrentUser, input: unknown) {
  assertCan(actor, "user.manage");
  const data = createSchema.parse(input);
  await assertEmailFree(data.email);

  const overrides = data.permissions ? overridesFor(data.role, data.permissions) : { granted: [], revoked: [] };
  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 10),
      permissionsGranted: overrides.granted,
      permissionsRevoked: overrides.revoked,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      meta: { email: user.email, role: user.role, granted: overrides.granted, revoked: overrides.revoked },
    },
  });
  return user;
}

export async function updateUser(actor: CurrentUser, input: unknown) {
  assertCan(actor, "user.manage");
  const data = updateSchema.parse(input);
  const target = await getTarget(data.id);
  const isSelf = target.id === actor.id;

  if (isSelf && data.role !== target.role) throw new ValidationError("Anda tidak dapat mengubah peran akun sendiri.");
  if (isSelf && !data.isActive) throw new ValidationError("Anda tidak dapat menonaktifkan akun sendiri.");
  const losesAdmin = target.role === "ADMIN" && target.isActive && (data.role !== "ADMIN" || !data.isActive);
  if (losesAdmin) await assertNotLastAdmin(target.id);
  if (data.email !== target.email) await assertEmailFree(data.email, target.id);

  // Hak akses disimpan sebagai selisih terhadap default peran yang baru.
  // Tidak dikirim + peran berubah → kembali ke default peran baru.
  let overrides = { granted: target.permissionsGranted, revoked: target.permissionsRevoked };
  if (data.permissions) overrides = overridesFor(data.role, data.permissions);
  else if (data.role !== target.role) overrides = { granted: [], revoked: [] };
  if (isSelf && !sameList(overrides.granted, target.permissionsGranted)) throw new ValidationError("Anda tidak dapat mengubah hak akses akun sendiri.");
  if (isSelf && !sameList(overrides.revoked, target.permissionsRevoked)) throw new ValidationError("Anda tidak dapat mengubah hak akses akun sendiri.");

  const user = await db.user.update({
    where: { id: target.id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
      permissionsGranted: overrides.granted,
      permissionsRevoked: overrides.revoked,
    },
  });

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of ["name", "email", "role", "isActive"] as const) {
    if (target[key] !== user[key]) changes[key] = { from: target[key], to: user[key] };
  }
  for (const key of ["permissionsGranted", "permissionsRevoked"] as const) {
    if (!sameList(target[key], user[key])) changes[key] = { from: target[key], to: user[key] };
  }
  if (Object.keys(changes).length > 0) {
    const action = changes.role
      ? "ROLE_CHANGED"
      : changes.isActive
        ? user.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED"
        : changes.permissionsGranted || changes.permissionsRevoked
          ? "PERMISSIONS_CHANGED"
          : "USER_UPDATED";
    await db.auditLog.create({ data: { actorId: actor.id, action, entity: "User", entityId: user.id, meta: changes as object } });
  }
  return user;
}

export async function resetPassword(actor: CurrentUser, input: unknown) {
  assertCan(actor, "user.manage");
  const data = resetSchema.parse(input);
  const target = await getTarget(data.id);
  await db.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(data.password, 10) } });
  await db.auditLog.create({ data: { actorId: actor.id, action: "PASSWORD_RESET", entity: "User", entityId: target.id } });
}

/** Jumlah data yang tercatat atas nama pengguna. Jika ada, pengguna tidak boleh dihapus permanen. */
export async function countUserData(userId: string) {
  const [contacts, companies, deals, stageMoves, tasks, comments, activities] = await Promise.all([
    db.contact.count({ where: { ownerId: userId } }),
    db.company.count({ where: { ownerId: userId } }),
    db.deal.count({ where: { ownerId: userId } }),
    db.dealStageHistory.count({ where: { changedById: userId } }),
    db.task.count({ where: { createdById: userId } }),
    db.comment.count({ where: { authorId: userId } }),
    db.activity.count({ where: { authorId: userId } }),
  ]);
  return { contacts, companies, deals, stageMoves, tasks, comments, activities };
}

export async function deleteUser(actor: CurrentUser, id: unknown) {
  assertCan(actor, "user.manage");
  const userId = z.string().min(1).parse(id);
  const target = await getTarget(userId);

  if (target.id === actor.id) throw new ValidationError("Anda tidak dapat menghapus akun sendiri.");
  if (target.role === "ADMIN" && target.isActive) await assertNotLastAdmin(target.id);

  const c = await countUserData(target.id);
  const parts = [
    c.contacts && `${c.contacts} kontak`,
    c.companies && `${c.companies} perusahaan`,
    c.deals && `${c.deals} deal`,
    c.tasks && `${c.tasks} tugas`,
    c.comments && `${c.comments} komentar`,
    c.activities && `${c.activities} aktivitas`,
    c.stageMoves && `${c.stageMoves} riwayat tahap`,
  ].filter(Boolean);
  if (parts.length > 0) {
    throw new ValidationError(
      `Pengguna ini sudah punya data (${parts.join(", ")}). Nonaktifkan saja agar riwayat tetap utuh.`,
    );
  }

  // Keanggotaan board, assignment, dan notifikasi ikut terhapus (onDelete: Cascade).
  await db.user.delete({ where: { id: target.id } });
  await db.auditLog.create({
    data: { actorId: actor.id, action: "USER_DELETED", entity: "User", entityId: target.id, meta: { email: target.email, name: target.name } },
  });
}
