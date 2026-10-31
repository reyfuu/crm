import "server-only";
import type { CurrentUser } from "@/server/session";
import type { Permission } from "@/lib/access";

// Pengecekan hak akses — docs/FRD.md bagian 2 (matriks) & FR-AUTH-12 (hak per pengguna).
// Hak efektif pengguna (default peran ± pengecualian) dihitung di requireUser().
export type Action =
  | Permission
  | "user.manage" // khusus peran Admin, tidak bisa diberikan ke peran lain
  | "contact.update" // pemilik selalu boleh; selain itu butuh contact.updateAll
  | "deal.update"; // semua pengguna boleh mengubah & menggeser deal siapa pun

type Resource = { ownerId?: string };

export function can(user: CurrentUser, action: Action, resource?: Resource): boolean {
  switch (action) {
    case "user.manage":
      return user.role === "ADMIN";
    case "deal.update":
      return true;
    case "contact.update":
      return resource?.ownerId === user.id || user.permissions.includes("contact.updateAll");
    default:
      return user.permissions.includes(action);
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Anda tidak memiliki akses untuk aksi ini.");
  }
}

export function assertCan(user: CurrentUser, action: Action, resource?: Resource) {
  if (!can(user, action, resource)) throw new ForbiddenError();
}
