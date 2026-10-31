import { NextResponse } from "next/server";
import { auth, signOut } from "@/server/auth";
import { db } from "@/server/db";

// Keluarkan sesi milik akun yang sudah dinonaktifkan atau dihapus.
// Akun yang masih aktif tidak ikut keluar (mencegah logout paksa lewat tautan).
export async function GET(request: Request) {
  const session = await auth();
  const id = session?.user?.id;
  if (id) {
    const user = await db.user.findUnique({ where: { id }, select: { isActive: true } });
    if (user?.isActive) return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  await signOut({ redirectTo: "/login?error=inactive" });
}
