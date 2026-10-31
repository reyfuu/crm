import type { Metadata } from "next";
import Link from "next/link";
import { endOfDay, startOfMonth, subDays } from "date-fns";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, PageHeader } from "@/components/ui/misc";
import { formatRupiahShort } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const isManager = user.role !== "MEMBER";
  const monthStart = startOfMonth(new Date());
  const since90 = subDays(new Date(), 90);

  const [stages, openByStage, wonMonth, closed90, myTasksToday, overdueMine, team] = await Promise.all([
    db.stage.findMany({ where: { type: "OPEN" }, orderBy: { position: "asc" } }),
    db.deal.groupBy({
      by: ["stageId"],
      where: { status: "OPEN", deletedAt: null },
      _sum: { value: true },
      _count: { _all: true },
    }),
    db.deal.aggregate({
      where: { status: "WON", deletedAt: null, closedAt: { gte: monthStart } },
      _sum: { value: true },
      _count: { _all: true },
    }),
    db.deal.groupBy({
      by: ["status"],
      where: { status: { in: ["WON", "LOST"] }, deletedAt: null, closedAt: { gte: since90 } },
      _count: { _all: true },
    }),
    db.task.findMany({
      where: {
        isArchived: false,
        completedAt: null,
        assignees: { some: { userId: user.id } },
        dueDate: { lte: endOfDay(new Date()) },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, title: true, dueDate: true },
    }),
    db.task.count({
      where: { isArchived: false, completedAt: null, assignees: { some: { userId: user.id } }, dueDate: { lt: new Date() } },
    }),
    isManager
      ? db.user.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            _count: { select: { deals: { where: { status: "OPEN", deletedAt: null } } } },
            deals: { where: { status: "WON", deletedAt: null, closedAt: { gte: monthStart } }, select: { value: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const byStage = new Map(openByStage.map((r) => [r.stageId, r]));
  const openTotal = openByStage.reduce((s, r) => s + Number(r._sum.value ?? 0), 0);
  const weighted = stages.reduce((s, st) => s + (Number(byStage.get(st.id)?._sum.value ?? 0) * st.probability) / 100, 0);
  const won = closed90.find((r) => r.status === "WON")?._count._all ?? 0;
  const lost = closed90.find((r) => r.status === "LOST")?._count._all ?? 0;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;
  const maxCount = Math.max(1, ...stages.map((s) => byStage.get(s.id)?._count._all ?? 0));

  const stats = [
    { label: "Pipeline terbuka", value: formatRupiahShort(openTotal) },
    { label: "Nilai tertimbang", value: formatRupiahShort(weighted) },
    { label: "Won bulan ini", value: `${wonMonth._count._all} · ${formatRupiahShort(Number(wonMonth._sum.value ?? 0))}` },
    { label: "Win rate 90 hari", value: winRate == null ? "—" : `${winRate}%` },
  ];

  return (
    <>
      <PageHeader title={`Halo, ${user.name.split(" ")[0]}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[13px] text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Funnel per tahap</h2>
          <div className="space-y-3">
            {stages.map((s) => {
              const row = byStage.get(s.id);
              const count = row?._count._all ?? 0;
              return (
                <div key={s.id} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="truncate">{s.name}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="tabular text-muted-foreground">
                    {count} · {formatRupiahShort(Number(row?._sum.value ?? 0))}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Tugas saya hari ini</h2>
            <Link href="/my-tasks" className="text-[13px] text-primary hover:underline">Lihat semua</Link>
          </div>
          {myTasksToday.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Tidak ada tugas jatuh tempo hari ini.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {myTasksToday.map((t) => (
                <li key={t.id} className="flex gap-2">
                  <span className={t.dueDate && t.dueDate < new Date() ? "text-danger" : ""}>•</span>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          )}
          {overdueMine > 0 && <p className="mt-3 text-[13px] font-medium text-danger">⚠ {overdueMine} tugas terlambat</p>}
        </Card>
      </div>

      {isManager && (
        <Card className="mt-6 overflow-x-auto">
          <h2 className="px-5 pt-4 font-semibold">Kinerja tim (bulan ini)</h2>
          <table className="mt-2 w-full text-[13px]">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                {["Nama", "Deal terbuka", "Won", "Nilai Won"].map((h) => (
                  <th key={h} className="px-5 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2">{m.name}</td>
                  <td className="px-5 py-2 tabular">{m._count.deals}</td>
                  <td className="px-5 py-2 tabular">{m.deals.length}</td>
                  <td className="px-5 py-2 tabular">{formatRupiahShort(m.deals.reduce((s, d) => s + Number(d.value), 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
