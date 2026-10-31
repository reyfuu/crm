import "server-only";
import type { CurrentUser } from "@/server/session";

// Matriks hak akses — lihat docs/FRD.md bagian 2.
export type Action =
  | "user.manage"
  | "contact.update"
  | "contact.delete"
  | "deal.update" // termasuk geser & Won/Lost: semua pengguna boleh, deal siapa pun
  | "deal.delete"
  | "deal.changeOwner"
  | "stage.manage"
  | "board.manage"
  | "data.import"
  | "data.export"
  | "audit.view";

type Resource = { ownerId?: string };

const isManagerUp = (u: CurrentUser) => u.role === "ADMIN" || u.role === "MANAGER";

export function can(user: CurrentUser, action: Action, resource?: Resource): boolean {
  switch (action) {
    case "user.manage":
    case "audit.view":
      return user.role === "ADMIN";
    case "deal.update":
      return true;
    case "contact.update":
      return isManagerUp(user) || resource?.ownerId === user.id;
    case "board.manage":
      return isManagerUp(user) || resource?.ownerId === user.id;
    case "contact.delete":
    case "deal.delete":
    case "deal.changeOwner":
    case "stage.manage":
    case "data.import":
    case "data.export":
      return isManagerUp(user);
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
