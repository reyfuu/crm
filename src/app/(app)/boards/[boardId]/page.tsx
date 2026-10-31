import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { getAccessibleBoard } from "@/server/services/tasks";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { TaskBoard, type ColumnData, type TaskCardData } from "./task-board";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await requireUser();
  const { boardId } = await params;
  const { task: initialTaskId } = await searchParams;
  const access = await getAccessibleBoard(user, boardId);
  if (!access) notFound();

  const columns = await db.boardColumn.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    include: {
      tasks: {
        where: { isArchived: false },
        orderBy: { position: "asc" },
        include: {
          assignees: { include: { user: { select: { name: true } } } },
          labels: true,
          deal: { select: { title: true } },
          contact: { select: { firstName: true, lastName: true } },
          _count: { select: { comments: true, attachments: true } },
          checklist: { select: { isDone: true } },
        },
      },
    },
  });
  const members = await db.user.findMany({
    where: { boardMembers: { some: { boardId } } },
    select: { id: true, name: true },
  });

  const columnData: ColumnData[] = columns.map((c) => ({ id: c.id, name: c.name, isDone: c.isDone, wipLimit: c.wipLimit }));
  const taskData: TaskCardData[] = columns.flatMap((c) =>
    c.tasks.map((t) => ({
      id: t.id,
      columnId: c.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      completed: !!t.completedAt,
      assignees: t.assignees.map((a) => a.user.name),
      labels: t.labels.map((l) => ({ name: l.name, color: l.color })),
      comments: t._count.comments,
      attachments: t._count.attachments,
      checklistDone: t.checklist.filter((i) => i.isDone).length,
      checklistTotal: t.checklist.length,
      related: t.deal?.title ?? (t.contact ? [t.contact.firstName, t.contact.lastName].filter(Boolean).join(" ") : null),
    })),
  );

  const canEdit = access.isMember || user.role !== "MEMBER";

  return (
    <>
      <PageHeader title={access.board.name}>
        <div className="mt-2 flex -space-x-1.5">
          {members.map((m) => (
            <Avatar key={m.id} name={m.name} />
          ))}
        </div>
      </PageHeader>
      {!canEdit && (
        <p className="mb-3 rounded-md bg-info/10 px-3 py-2 text-[13px] text-info">
          Anda bukan anggota board ini, jadi hanya bisa melihat.
        </p>
      )}
      <TaskBoard columns={columnData} tasks={taskData} canEdit={canEdit} initialTaskId={initialTaskId} />
    </>
  );
}
