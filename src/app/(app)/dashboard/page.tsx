import type { Metadata } from "next";
import Link from "next/link";
import { endOfDay, startOfDay, startOfMonth, subDays } from "date-fns";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined, CheckCheck, Circle, Clock3, Plus, Target, Trophy, Wallet } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { can } from "@/server/permissions";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatRupiahShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const isManager = can(user, "dashboard.team");
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const since90 = subDays(now, 90);

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
        dueDate: { lte: endOfDay(now) },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { id: true, title: true, dueDate: true, column: { select: { boardId: true } } },
    }),
    db.task.count({
      where: { isArchived: false, completedAt: null, assignees: { some: { userId: user.id } }, dueDate: { lt: todayStart } },
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
  const openCount = openByStage.reduce((s, r) => s + r._count._all, 0);
  const weighted = stages.reduce((s, st) => s + (Number(byStage.get(st.id)?._sum.value ?? 0) * st.probability) / 100, 0);
  const won = closed90.find((r) => r.status === "WON")?._count._all ?? 0;
  const lost = closed90.find((r) => r.status === "LOST")?._count._all ?? 0;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;
  const maxCount = Math.max(1, ...stages.map((s) => byStage.get(s.id)?._count._all ?? 0));
  const stageColors = ["bg-primary", "bg-info", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];
  const stats = [
    { label: "Pipeline terbuka", value: formatRupiahShort(openTotal), detail: `${openCount} peluang sedang berjalan`, icon: Wallet, tone: "text-primary bg-primary/10" },
    { label: "Estimasi tertimbang", value: formatRupiahShort(weighted), detail: "Berdasarkan probabilitas tiap tahap", icon: ChartNoAxesCombined, tone: "text-info bg-info/10" },
    { label: "Penjualan bulan ini", value: formatRupiahShort(Number(wonMonth._sum.value ?? 0)), detail: `${wonMonth._count._all} deal berhasil dimenangkan`, icon: Trophy, tone: "text-warning bg-warning/10" },
    { label: "Win rate", value: winRate == null ? "—" : `${winRate}%`, detail: `${won} menang dari ${won + lost} deal · 90 hari`, icon: Target, tone: "text-primary bg-primary/10" },
  ];

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase"><span className="size-1.5 rounded-full bg-primary" /> Ringkasan workspace</div>
      <PageHeader title={`Halo, ${user.name.split(" ")[0]}.`} actions={<Link href="/contacts/new" className={buttonVariants()}><Plus aria-hidden="true" /> Tambah kontak</Link>}>
        <p className="mt-2 text-sm text-muted-foreground">Semua peluang dan prioritas tim, dalam satu tempat.</p>
      </PageHeader>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <span className="flex items-center gap-2 text-sm font-medium"><ChartNoAxesCombined className="size-4 text-primary" aria-hidden="true" /> Performa penjualan</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" /> {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now)}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="relative overflow-hidden p-5">
            <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-medium text-muted-foreground">{label}</p><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone)}><Icon className="size-[18px]" aria-hidden="true" /></span></div>
            <p className="mt-4 text-[28px] leading-tight font-semibold tracking-tight tabular">{value}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
        <Card className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6">
            <div><h2 className="text-base font-semibold">Pipeline per tahap</h2><p className="mt-1 text-xs text-muted-foreground">Panjang bar menunjukkan jumlah deal terbuka.</p></div>
            <Link href="/deals" aria-label="Buka pipeline penjualan" className="flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface hover:text-primary"><ArrowUpRight className="size-4" /></Link>
          </div>
          <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            {stages.length === 0 ? <p className="py-8 text-sm text-muted-foreground">Belum ada tahap pipeline yang tersedia.</p> : stages.map((s, index) => {
              const row = byStage.get(s.id);
              const count = row?._count._all ?? 0;
              return (
                <div key={s.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-2.5 font-medium"><span className={cn("size-2 rounded-full", stageColors[index % stageColors.length])} aria-hidden="true" />{s.name}<span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</span></span>
                    <span className="font-medium tabular">{formatRupiahShort(Number(row?._sum.value ?? 0))}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true"><div className={cn("h-full rounded-full", stageColors[index % stageColors.length])} style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs"><span className="text-muted-foreground">Total {openCount} deal terbuka</span><Link href="/deals" className="flex min-h-8 items-center gap-1.5 font-medium text-primary hover:underline">Lihat pipeline <ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="text-base font-semibold">Fokus hari ini</h2><p className="mt-1 text-xs text-muted-foreground">Tugas jatuh tempo dan tindak lanjut.</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-surface text-muted-foreground"><Clock3 className="size-5" aria-hidden="true" /></span></div>
          <div className="flex-1 p-5">
            {myTasksToday.length === 0 ? (
              <div className="flex h-full min-h-44 flex-col items-center justify-center gap-3 text-center"><span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCheck className="size-6" aria-hidden="true" /></span><p className="text-sm font-medium">Hari ini sudah terkendali</p><p className="max-w-52 text-xs leading-relaxed text-muted-foreground">Tidak ada tugas yang jatuh tempo. Waktunya menyiapkan langkah berikutnya.</p></div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {myTasksToday.map((t) => (
                  <li key={t.id}><Link href={`/boards/${t.column.boardId}?task=${t.id}`} className="group flex gap-3 rounded-md py-3 first:pt-1"><Circle className={cn("mt-0.5 size-4 shrink-0", t.dueDate && t.dueDate < todayStart ? "text-danger" : "text-muted-foreground")} aria-hidden="true" /><div className="min-w-0"><p className="text-[13px] font-medium group-hover:text-primary">{t.title}</p><p className={cn("mt-1 text-[11px]", t.dueDate && t.dueDate < todayStart ? "text-danger" : "text-muted-foreground")}>{t.dueDate && t.dueDate < todayStart ? `Terlambat · ${formatDate(t.dueDate)}` : "Jatuh tempo hari ini"}</p></div></Link></li>
                ))}
              </ul>
            )}
            {overdueMine > 0 && <div className="mt-4 flex items-center gap-2 rounded-md bg-danger/8 px-3 py-2 text-xs font-medium text-danger"><Clock3 className="size-3.5" aria-hidden="true" /> {overdueMine} tugas perlu ditindaklanjuti</div>}
          </div>
          <Link href="/my-tasks" className="flex min-h-16 items-center justify-between border-t border-border px-5 text-xs font-medium text-primary hover:bg-surface">Lihat semua tugas <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </Card>
      </div>

      <div className={cn("mt-6 grid gap-5", isManager && "xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]")}>
        {isManager && (
          <Card className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-5"><div><h2 className="text-base font-semibold">Kinerja tim</h2><p className="mt-1 text-xs text-muted-foreground">Kontribusi penjualan bulan ini.</p></div><Badge tone="slate">{team.length} anggota</Badge></div>
            <div className="overflow-x-auto"><table className="w-full text-[13px]"><caption className="sr-only">Kinerja penjualan anggota tim bulan ini</caption>
              <thead className="border-y border-border text-left text-xs text-muted-foreground"><tr>{["Anggota tim", "Deal terbuka", "Won", "Nilai won"].map((h) => <th key={h} scope="col" className="px-6 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>{team.map((m) => <tr key={m.id} className="border-b border-border last:border-0"><td className="px-6 py-3"><span className="flex items-center gap-3"><Avatar name={m.name} size={30} /><span className="font-medium">{m.name}</span></span></td><td className="px-6 py-3 tabular">{m._count.deals}</td><td className="px-6 py-3"><Badge tone="green">{m.deals.length}</Badge></td><td className="px-6 py-3 font-medium tabular">{formatRupiahShort(m.deals.reduce((s, d) => s + Number(d.value), 0))}</td></tr>)}</tbody>
            </table></div>
          </Card>
        )}
        <div className="relative overflow-hidden rounded-lg bg-sidebar p-6 text-sidebar-accent-foreground">
          <div aria-hidden="true" className="absolute -top-16 -right-16 size-56 rounded-full border border-sidebar-primary/15" /><div aria-hidden="true" className="absolute -top-8 -right-8 size-40 rounded-full border border-sidebar-primary/15" />
          <span className="relative flex size-10 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-primary"><ArrowDownRight className="size-5" aria-hidden="true" /></span>
          <p className="relative mt-6 text-[11px] font-medium tracking-[0.15em] text-sidebar-primary uppercase">Langkah berikutnya</p><h2 className="relative mt-2 max-w-60 text-xl leading-snug font-semibold tracking-tight">Relasi yang baik dimulai dari satu percakapan.</h2><p className="relative mt-3 max-w-64 text-xs leading-relaxed text-sidebar-foreground">Catat kontak baru, temukan peluang, dan jaga setiap tindak lanjut tetap terarah.</p>
          <Link href="/contacts" className="relative mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sidebar-primary hover:underline">Jelajahi kontak <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </>
  );
}
