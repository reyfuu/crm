import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { can } from "@/server/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate, formatRelative } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import { effectivePermissions } from "@/lib/access";
import { CreateUserButton, UserRowActions } from "./user-dialogs";

export const metadata: Metadata = { title: "Pengguna" };

const roles = ["ADMIN", "MANAGER", "MEMBER"] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "user.manage")) notFound();
  const { q, role, status } = await searchParams;

  const where: Prisma.UserWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }),
    ...(role && (roles as readonly string[]).includes(role) && { role: role as (typeof roles)[number] }),
    ...(status === "active" && { isActive: true }),
    ...(status === "inactive" && { isActive: false }),
  };

  const [users, totals] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, permissionsGranted: true, permissionsRevoked: true },
    }),
    db.user.groupBy({ by: ["isActive"], _count: true }),
  ]);
  const active = totals.find((t) => t.isActive)?._count ?? 0;
  const inactive = totals.find((t) => !t.isActive)?._count ?? 0;
  const filtered = !!(q || role || status);

  return (
    <>
      <PageHeader title="Pengguna" actions={<CreateUserButton />}>
        <p className="mt-2 text-sm text-muted-foreground">
          {active} aktif{inactive > 0 && ` · ${inactive} nonaktif`}. Atur siapa yang bisa masuk dan apa perannya.
        </p>
      </PageHeader>

      <form className="mb-5 flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4">
        <Input name="q" aria-label="Cari nama atau email" defaultValue={q} placeholder="Cari nama atau email…" className="sm:max-w-xs" />
        <Select name="role" aria-label="Filter peran" defaultValue={role ?? ""} className="w-40">
          <option value="">Semua peran</option>
          {roles.map((r) => (
            <option key={r} value={r}>{roleLabel[r].label}</option>
          ))}
        </Select>
        <Select name="status" aria-label="Filter status" defaultValue={status ?? ""} className="w-40">
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </Select>
        <button className={buttonVariants({ variant: "secondary" })}>Terapkan</button>
        {filtered && <Link href="/settings/users" className={buttonVariants({ variant: "ghost" })}>Reset</Link>}
      </form>

      {users.length === 0 ? (
        <EmptyState title="Tidak ada pengguna yang cocok" description="Ubah kata kunci atau filter pencarian." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                {["Nama", "Peran", "Status", "Login terakhir", "Dibuat"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h}</th>
                ))}
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} size={32} />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {u.name}
                          {u.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
                        </span>
                        <span className="block truncate text-muted-foreground">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={roleLabel[u.role].tone}>{roleLabel[u.role].label}</Badge>
                      {u.role !== "ADMIN" && u.permissionsGranted.length + u.permissionsRevoked.length > 0 && (
                        <Badge tone="amber" title={`+${u.permissionsGranted.length} ditambahkan, −${u.permissionsRevoked.length} dicabut dari default peran`}>Akses khusus</Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.isActive ? <Badge tone="green">Aktif</Badge> : <Badge tone="zinc">Nonaktif</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Belum pernah"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <UserRowActions
                      user={{ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, permissions: effectivePermissions(u.role, u.permissionsGranted, u.permissionsRevoked) }}
                      isSelf={u.id === me.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
