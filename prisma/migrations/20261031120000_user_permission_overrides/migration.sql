-- Pengecualian hak akses per pengguna (lihat src/lib/access.ts)
ALTER TABLE "User" ADD COLUMN     "permissionsGranted" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "permissionsRevoked" TEXT[] DEFAULT ARRAY[]::TEXT[];
