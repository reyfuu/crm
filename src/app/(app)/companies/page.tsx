import type { Metadata } from "next";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatRupiahShort } from "@/lib/format";

export const metadata: Metadata = { title: "Perusahaan" };

export default async function CompaniesPage() {
  await requireUser();
  const companies = await db.company.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      owner: { select: { name: true } },
      _count: { select: { contacts: { where: { deletedAt: null } } } },
      deals: { where: { status: "OPEN", deletedAt: null }, select: { value: true } },
    },
  });

  return (
    <>
      <PageHeader title={`Perusahaan (${companies.length})`}><p className="mt-2 text-sm text-muted-foreground">Kenali perusahaan, hubungan, dan peluang bisnis Anda.</p></PageHeader>
      {companies.length === 0 ? (
        <EmptyState title="Belum ada perusahaan" description="Perusahaan akan muncul di sini setelah ditambahkan." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                {["Nama", "Industri", "Kota", "Kontak", "Deal terbuka", "Owner"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5">{c.industry ?? "—"}</td>
                  <td className="px-4 py-2.5">{c.city ?? "—"}</td>
                  <td className="px-4 py-2.5 tabular">{c._count.contacts}</td>
                  <td className="px-4 py-2.5 tabular">
                    {formatRupiahShort(c.deals.reduce((s, d) => s + Number(d.value), 0))}
                  </td>
                  <td className="px-4 py-2.5"><Avatar name={c.owner.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
