import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

/** Ambil pengguna yang sedang login; arahkan ke /login bila belum. */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role) redirect("/login");
  return { id: u.id, name: u.name ?? "", email: u.email ?? "", role: u.role };
});
