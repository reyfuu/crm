import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { effectivePermissions, type Permission } from "@/lib/access";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = { id: string; name: string; email: string; role: Role; permissions: Permission[] };

/**
 * Ambil pengguna yang sedang login; arahkan ke /login bila belum.
 * Nama, peran, hak akses, dan status aktif dibaca dari database (bukan dari token),
 * sehingga perubahan oleh Admin langsung berlaku (TR-SEC-11).
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true, permissionsGranted: true, permissionsRevoked: true },
  });
  // Akun dihapus/dinonaktifkan: hapus sesi lewat /session-ended.
  if (!user || !user.isActive) redirect("/session-ended");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: effectivePermissions(user.role, user.permissionsGranted, user.permissionsRevoked),
  };
});
