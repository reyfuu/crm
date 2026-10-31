// Buat pengguna baru langsung di database (mis. admin pertama tanpa data contoh).
// Pakai: node scripts/create-user.mjs admin@perusahaan.com "Nama Admin" ADMIN "PasswordKuat123"
// Peran: ADMIN | MANAGER | MEMBER
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const [email, name, role, password] = process.argv.slice(2);
const roles = ["ADMIN", "MANAGER", "MEMBER"];
if (!email || !name || !roles.includes(role) || !password || password.length < 8) {
  console.error('Pakai: node scripts/create-user.mjs <email> "<nama>" <ADMIN|MANAGER|MEMBER> "<password minimal 8 karakter>"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const hash = await bcrypt.hash(password, 10);
  await client.query(
    'INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, true, now(), now())',
    [randomUUID(), name, email.toLowerCase(), hash, role],
  );
  console.log(`Pengguna ${email} (${role}) berhasil dibuat.`);
} catch (e) {
  console.error(e.code === "23505" ? `Email ${email} sudah terdaftar.` : e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
