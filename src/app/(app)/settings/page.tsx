import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { can } from "@/server/permissions";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Pengaturan" };

// Versi awal: hanya menampilkan data. Form pengelolaan menyusul (docs/FRD.md modul SET).
export default async function SettingsPage() {
  const user = await requireUser();
  if (!can(user, "stage.manage")) notFound();

  const [stages, users, reasons] = await Promise.all([
    db.stage.findMany({ orderBy: { position: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true } }),
    db.lostReason.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Tahap pipeline</h2>
          <ul className="divide-y divide-border text-[13px]">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>{s.name}</span>
                <span className="text-muted-foreground tabular">
                  {s.probability}%{s.type === "OPEN" && ` · macet setelah ${s.rottingDays} hari`}
                </span>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 mb-3 font-semibold">Alasan Lost</h2>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <Badge key={r.id}>{r.name}</Badge>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Pengguna</h2>
          <ul className="divide-y divide-border text-[13px]">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2">
                <Avatar name={u.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.name}</p>
                  <p className="truncate text-muted-foreground">{u.email}</p>
                </div>
                <Badge tone={u.role === "ADMIN" ? "indigo" : u.role === "MANAGER" ? "sky" : "slate"}>{u.role}</Badge>
                {!u.isActive && <Badge tone="zinc">Nonaktif</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
