import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Avatar, Badge, Card } from "@/components/ui/misc";
import { activityType, contactStatus } from "@/lib/labels";
import { formatDate, formatRelative, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActivityForm } from "./activity-form";

export const metadata: Metadata = { title: "Detail kontak" };

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const contact = await db.contact.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: true,
      owner: { select: { name: true } },
      deals: { where: { deletedAt: null }, include: { stage: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 50 },
    },
  });
  if (!contact) notFound();

  const authorIds = [...new Set(contact.activities.map((a) => a.authorId).filter(Boolean))] as string[];
  const authors = new Map(
    (await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const status = contactStatus[contact.status];

  return (
    <>
      <Link href="/contacts" className="text-[13px] text-muted-foreground hover:text-foreground">← Kontak</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <Avatar name={name} size={48} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{name}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {[contact.jobTitle, contact.company?.name, contact.email, contact.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
          <ActivityForm contactId={contact.id} />
          <ol className="mt-5 space-y-4">
            {contact.activities.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-1.5 size-2.5 shrink-0 rounded-full",
                    a.type === "SYSTEM" ? "bg-border" : "bg-primary",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {activityType[a.type]}
                    {a.authorId && ` · ${authors.get(a.authorId) ?? "—"}`} ·{" "}
                    <time title={formatDate(a.occurredAt)}>{formatRelative(a.occurredAt)}</time>
                  </p>
                  <p className={cn("whitespace-pre-wrap", a.type === "SYSTEM" && "text-muted-foreground")}>{a.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-2 p-4 text-[13px]">
            <h2 className="font-semibold">Ringkasan</h2>
            <p><span className="text-muted-foreground">Owner:</span> {contact.owner.name}</p>
            <p><span className="text-muted-foreground">Sumber:</span> {contact.source ?? "—"}</p>
            <p><span className="text-muted-foreground">Dibuat:</span> {formatDate(contact.createdAt)}</p>
          </Card>
          <Card className="p-4 text-[13px]">
            <h2 className="mb-2 font-semibold">Deal ({contact.deals.length})</h2>
            {contact.deals.length === 0 && <p className="text-muted-foreground">Belum ada deal.</p>}
            <ul className="space-y-2">
              {contact.deals.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span className="truncate">{d.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {d.stage.name} · <span className="tabular">{formatRupiah(d.value.toString())}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
