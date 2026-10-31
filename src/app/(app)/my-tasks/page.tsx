import type { Metadata } from "next";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { TaskRow, type MyTask } from "./task-row";

export const metadata: Metadata = { title: "Tugas Saya" };

export default async function MyTasksPage() {
  const user = await requireUser();
  const tasks = await db.task.findMany({
    where: { isArchived: false, completedAt: null, assignees: { some: { userId: user.id } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    include: { column: { select: { board: { select: { id: true, name: true } } } } },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));
  const rows: (MyTask & { due: Date | null })[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    boardId: t.column.board.id,
    boardName: t.column.board.name,
    due: t.dueDate,
  }));

  const groups = [
    { title: "Terlambat", tone: "text-danger", items: rows.filter((t) => t.due && t.due < todayStart) },
    { title: "Hari ini", tone: "", items: rows.filter((t) => t.due && t.due >= todayStart && t.due <= todayEnd) },
    { title: "7 hari ke depan", tone: "", items: rows.filter((t) => t.due && t.due > todayEnd && t.due <= weekEnd) },
    { title: "Nanti", tone: "", items: rows.filter((t) => t.due && t.due > weekEnd) },
    { title: "Tanpa tanggal", tone: "", items: rows.filter((t) => !t.due) },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader title="Tugas Saya" />
      {groups.length === 0 ? (
        <EmptyState title="Semua tugas beres 🎉" description="Tidak ada tugas terbuka yang di-assign ke Anda." />
      ) : (
        <div className="max-w-3xl space-y-5">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className={`mb-2 text-[15px] font-semibold ${g.tone}`}>
                {g.title} ({g.items.length})
              </h2>
              <Card className="divide-y divide-border">
                {g.items.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
