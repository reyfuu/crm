import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { PageHeader } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { DealsBoard, type DealCardData, type StageData } from "./deals-board";

export const metadata: Metadata = { title: "Pipeline" };

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ mine?: string; q?: string; deal?: string }> }) {
  const user = await requireUser();
  const { mine, q, deal } = await searchParams;

  const [stages, deals, lostReasons, companies, contacts, users] = await Promise.all([
    db.stage.findMany({ orderBy: { position: "asc" } }),
    db.deal.findMany({
      where: {
        status: "OPEN",
        deletedAt: null,
        ...(mine === "1" && { ownerId: user.id }),
        ...(q && { title: { contains: q, mode: "insensitive" as const } }),
      },
      orderBy: { position: "asc" },
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        owner: { select: { name: true } },
        _count: { select: { tasks: { where: { completedAt: null, isArchived: false } } } },
      },
    }),
    db.lostReason.findMany({ orderBy: { position: "asc" }, select: { name: true } }),
    db.company.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.contact.findMany({
      where: { deletedAt: null },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
      take: 500,
    }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Data dikirim ke klien dalam bentuk sederhana (Decimal & Date → string).
  const stageData: StageData[] = stages.map((s) => ({ id: s.id, name: s.name, type: s.type, probability: s.probability, rottingDays: s.rottingDays }));
  const dealData: DealCardData[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value.toString(),
    priority: d.priority,
    stageId: d.stageId,
    stageEnteredAt: d.stageEnteredAt.toISOString(),
    expectedCloseDate: d.expectedCloseDate?.toISOString() ?? null,
    companyName: d.company?.name ?? null,
    contactName: d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") : null,
    ownerName: d.owner.name,
    openTasks: d._count.tasks,
  }));

  const tab = (active: boolean) =>
    cn("rounded-md px-3 py-1.5 text-[13px] font-medium", active ? "bg-card shadow-(--shadow-card)" : "text-muted-foreground");

  return (
    <>
      <PageHeader title="Pipeline Penjualan">
        <div className="mt-2 inline-flex rounded-lg bg-surface p-1">
          <Link href="/deals" className={tab(mine !== "1")}>Semua deal</Link>
          <Link href="/deals?mine=1" className={tab(mine === "1")}>Deal saya</Link>
        </div>
      </PageHeader>
      <DealsBoard
        stages={stageData}
        deals={dealData}
        lostReasons={lostReasons.map((r) => r.name)}
        companies={companies}
        contacts={contacts.map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ") }))}
        users={users}
        initialDealId={deal}
      />
    </>
  );
}
