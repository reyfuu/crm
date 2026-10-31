import NextAuth from "next-auth";
import { authConfig } from "@/server/auth.config";

// Pemeriksaan cepat: pengguna tanpa sesi diarahkan ke /login.
// Otorisasi sebenarnya tetap dicek di server (lihat src/server/session.ts).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
