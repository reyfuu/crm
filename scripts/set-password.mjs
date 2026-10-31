// Ganti password satu pengguna langsung di database.
// Pakai: node scripts/set-password.mjs admin@crm.local "PasswordBaruYangKuat"
import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  console.error('Pakai: node scripts/set-password.mjs <email> "<password min. 8 karakter, huruf + angka>"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const hash = await bcrypt.hash(password, 10);
const res = await client.query('UPDATE "User" SET "passwordHash" = $1, "updatedAt" = now() WHERE email = $2', [hash, email.toLowerCase()]);
await client.end();

if (res.rowCount === 0) {
  console.error(`Pengguna ${email} tidak ditemukan.`);
  process.exit(1);
}
console.log(`Password ${email} berhasil diganti.`);
