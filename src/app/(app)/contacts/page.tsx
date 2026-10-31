import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { contactStatus } from "@/lib/labels";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Kontak" };

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireUser();
  const { q, status, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const where: Prisma.ContactWhereInput = {
    deletedAt: null,
    ...(status && status in contactStatus && { status: status as keyof typeof contactStatus }),
    ...(q && {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q.replace(/\D/g, "") || q } },
      ],
    }),
  };

  const [total, contacts] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { company: { select: { name: true } }, owner: { select: { name: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => `/contacts?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title={`Kontak (${total.toLocaleString("id-ID")})`}
        actions={
          <Link href="/contacts/new" className={buttonVariants()}>
            <Plus /> Kontak
          </Link>
        }
      ><p className="mt-2 text-sm text-muted-foreground">Bangun relasi dan kelola setiap kontak pelanggan Anda.</p></PageHeader>
      <form className="mb-5 flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4">
        <Input name="q" aria-label="Cari nama, email, atau telepon" defaultValue={q} placeholder="Cari nama, email, telepon…" className="sm:max-w-xs" />
        <Select name="status" aria-label="Filter status kontak" defaultValue={status ?? ""} className="w-40">
          <option value="">Semua status</option>
          {Object.entries(contactStatus).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
        <button className={buttonVariants({ variant: "secondary" })}>Terapkan</button>
        {(q || status) && <Link href="/contacts" className={buttonVariants({ variant: "ghost" })}>Reset</Link>}
      </form>

      {contacts.length === 0 ? (
        <EmptyState
          title={q || status ? "Tidak ada kontak yang cocok" : "Belum ada kontak"}
          description="Tambahkan kontak pertama Anda untuk mulai mencatat lead."
          action={<Link href="/contacts/new" className={buttonVariants()}>Tambah kontak</Link>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                {["Nama", "Perusahaan", "Email", "Telepon", "Status", "Owner", "Diperbarui"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-2.5">
                    <Link href={`/contacts/${c.id}`} className="font-medium hover:text-primary">
                      <span className="flex items-center gap-3"><Avatar name={[c.firstName, c.lastName].filter(Boolean).join(" ")} size={32} />{[c.firstName, c.lastName].filter(Boolean).join(" ")}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{c.company?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{c.email ?? "—"}</td>
                  <td className="px-4 py-2.5 tabular">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={contactStatus[c.status].tone}>{contactStatus[c.status].label}</Badge>
                  </td>
                  <td className="px-4 py-2.5"><Avatar name={c.owner.name} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatRelative(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-[13px]">
          {pageNum > 1 && <Link href={pageHref(pageNum - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>‹ Sebelumnya</Link>}
          <span className="text-muted-foreground">Halaman {pageNum} dari {pages}</span>
          {pageNum < pages && <Link href={pageHref(pageNum + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>Berikutnya ›</Link>}
        </div>
      )}
    </>
  );
}
