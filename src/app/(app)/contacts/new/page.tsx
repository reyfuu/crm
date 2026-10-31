import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, PageHeader } from "@/components/ui/misc";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Kontak baru" };

export default async function NewContactPage() {
  await requireUser();
  const [companies, sources] = await Promise.all([
    db.company.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.leadSource.findMany({ orderBy: { position: "asc" }, select: { name: true } }),
  ]);
  return (
    <>
      <Link href="/contacts" className="text-[13px] text-muted-foreground hover:text-foreground">← Kontak</Link>
      <PageHeader title="Kontak baru" />
      <Card className="max-w-2xl p-5">
        <ContactForm companies={companies} sources={sources.map((s) => s.name)} />
      </Card>
    </>
  );
}
