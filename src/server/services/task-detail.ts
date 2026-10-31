import "server-only";
import { z } from "zod";
import { format } from "date-fns";
import { db } from "@/server/db";
import { ForbiddenError, can } from "@/server/permissions";
import { NotFoundError } from "@/server/action-utils";
import type { CurrentUser } from "@/server/session";
import { getAccessibleBoard } from "@/server/services/tasks";
import { positionBetween } from "@/lib/position";

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null; // yyyy-MM-dd
  completed: boolean;
  columnId: string;
  boardId: string;
  boardName: string;
  columns: { id: string; name: string }[];
  members: { id: string; name: string }[];
  assigneeIds: string[];
  checklist: { id: string; text: string; isDone: boolean }[];
  comments: { id: string; authorId: string; authorName: string; body: string; createdAt: string }[];
  related: { label: string; href: string } | null;
  createdByName: string;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
  currentUserId: string;
  canDeleteAnyComment: boolean;
};

/** Ambil tugas + board-nya, dan pastikan pengguna boleh melihat/mengubah. */
async function loadTask(user: CurrentUser, taskId: string, mode: "view" | "edit") {
  const task = await db.task.findUnique({ where: { id: taskId }, include: { column: true } });
  if (!task) throw new NotFoundError("Tugas tidak ditemukan.");
  const access = await getAccessibleBoard(user, task.column.boardId);
  if (!access) throw new NotFoundError("Tugas tidak ditemukan.");
  const canEdit = access.isMember || can(user, "board.manageAll");
  if (mode === "edit" && !canEdit) throw new ForbiddenError();
  return { task, board: access.board, canEdit };
}

const notify = (userId: string, type: string, title: string, link: string) =>
  db.notification.create({ data: { userId, type, title, link } });

export async function getTaskDetail(user: CurrentUser, taskId: string): Promise<TaskDetail> {
  const { task, board, canEdit } = await loadTask(user, taskId, "view");
  const [full, columns, members] = await Promise.all([
    db.task.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        assignees: true,
        checklist: { orderBy: { position: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.boardColumn.findMany({ where: { boardId: board.id }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { boardMembers: { some: { boardId: board.id } }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const authorIds = [...new Set([...full.comments.map((c) => c.authorId), full.createdById])];
  const authors = new Map(
    (await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );

  return {
    id: full.id,
    title: full.title,
    description: full.description ?? "",
    priority: full.priority,
    dueDate: full.dueDate ? format(full.dueDate, "yyyy-MM-dd") : null,
    completed: !!full.completedAt,
    columnId: full.columnId,
    boardId: board.id,
    boardName: board.name,
    columns,
    members,
    assigneeIds: full.assignees.map((a) => a.userId),
    checklist: full.checklist.map((i) => ({ id: i.id, text: i.text, isDone: i.isDone })),
    comments: full.comments.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      authorName: authors.get(c.authorId) ?? "?",
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
    related: full.deal
      ? { label: `Deal: ${full.deal.title}`, href: `/deals?deal=${full.deal.id}` }
      : full.contact
        ? { label: `Kontak: ${[full.contact.firstName, full.contact.lastName].filter(Boolean).join(" ")}`, href: `/contacts/${full.contact.id}` }
        : null,
    createdByName: authors.get(full.createdById) ?? "?",
    createdAt: full.createdAt.toISOString(),
    canEdit,
    canDelete: full.createdById === user.id || can(user, "task.deleteAny"),
    currentUserId: user.id,
    canDeleteAnyComment: can(user, "task.deleteAny"),
  };
}

export const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "Judul wajib diisi").max(300).optional(),
  description: z.string().max(20000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? new Date(v) : null)),
});

export async function updateTask(user: CurrentUser, input: unknown) {
  const { taskId, ...data } = updateTaskSchema.parse(input);
  const { task } = await loadTask(user, taskId, "edit");
  await db.task.update({ where: { id: task.id }, data });
}

export const setAssigneesSchema = z.object({ taskId: z.string().min(1), userIds: z.array(z.string()).max(20) });

export async function setAssignees(user: CurrentUser, input: unknown) {
  const data = setAssigneesSchema.parse(input);
  const { task, board } = await loadTask(user, data.taskId, "edit");
  const current = await db.taskAssignee.findMany({ where: { taskId: task.id } });
  const currentIds = new Set(current.map((a) => a.userId));
  const added = data.userIds.filter((id) => !currentIds.has(id));

  await db.$transaction([
    db.taskAssignee.deleteMany({ where: { taskId: task.id, userId: { notIn: data.userIds } } }),
    // BRL-TASK-3: assignee otomatis menjadi anggota board.
    ...added.map((userId) =>
      db.boardMember.upsert({ where: { boardId_userId: { boardId: board.id, userId } }, create: { boardId: board.id, userId }, update: {} }),
    ),
    db.taskAssignee.createMany({ data: added.map((userId) => ({ taskId: task.id, userId })), skipDuplicates: true }),
  ]);
  // FR-NOTIF-01
  await Promise.all(
    added
      .filter((id) => id !== user.id)
      .map((id) => notify(id, "TASK_ASSIGNED", `${user.name} menugaskan Anda: "${task.title}"`, `/boards/${board.id}?task=${task.id}`)),
  );
}

export async function addChecklistItem(user: CurrentUser, taskId: string, text: string) {
  const clean = z.string().trim().min(1, "Isi item").max(500).parse(text);
  const { task } = await loadTask(user, taskId, "edit");
  const last = await db.checklistItem.findFirst({ where: { taskId: task.id }, orderBy: { position: "desc" } });
  await db.checklistItem.create({ data: { taskId: task.id, text: clean, position: positionBetween(last?.position ?? null, null) } });
}

async function loadChecklistItem(user: CurrentUser, itemId: string) {
  const item = await db.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item tidak ditemukan.");
  await loadTask(user, item.taskId, "edit");
  return item;
}

export async function toggleChecklistItem(user: CurrentUser, itemId: string) {
  const item = await loadChecklistItem(user, itemId);
  await db.checklistItem.update({ where: { id: item.id }, data: { isDone: !item.isDone } });
}

export async function deleteChecklistItem(user: CurrentUser, itemId: string) {
  const item = await loadChecklistItem(user, itemId);
  await db.checklistItem.delete({ where: { id: item.id } });
}

/** Cari @NamaDepan di komentar dan cocokkan dengan anggota board. */
function findMentions(body: string, members: { id: string; name: string }[]) {
  const lower = body.toLowerCase();
  return members.filter((m) => lower.includes("@" + m.name.split(" ")[0]!.toLowerCase())).map((m) => m.id);
}

export async function addComment(user: CurrentUser, taskId: string, body: string) {
  const clean = z.string().trim().min(1, "Tulis komentar").max(5000).parse(body);
  const { task, board } = await loadTask(user, taskId, "edit");
  const members = await db.user.findMany({ where: { boardMembers: { some: { boardId: board.id } } }, select: { id: true, name: true } });
  const mentions = findMentions(clean, members).filter((id) => id !== user.id);
  await db.comment.create({ data: { taskId: task.id, authorId: user.id, body: clean, mentions } });

  const link = `/boards/${board.id}?task=${task.id}`;
  const assignees = await db.taskAssignee.findMany({ where: { taskId: task.id } });
  await Promise.all([
    // FR-NOTIF-02
    ...mentions.map((id) => notify(id, "MENTION", `${user.name} menyebut Anda di "${task.title}"`, link)),
    // FR-NOTIF-05 (yang sudah di-mention tidak dikirimi dua kali)
    ...assignees
      .filter((a) => a.userId !== user.id && !mentions.includes(a.userId))
      .map((a) => notify(a.userId, "COMMENT", `${user.name} mengomentari "${task.title}"`, link)),
  ]);
}

export async function deleteComment(user: CurrentUser, commentId: string) {
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError("Komentar tidak ditemukan.");
  if (comment.authorId !== user.id && !can(user, "task.deleteAny")) throw new ForbiddenError();
  await db.comment.delete({ where: { id: comment.id } });
}

export async function archiveTask(user: CurrentUser, taskId: string) {
  const { task } = await loadTask(user, taskId, "edit");
  await db.task.update({ where: { id: task.id }, data: { isArchived: true } });
}

export async function deleteTask(user: CurrentUser, taskId: string) {
  const { task } = await loadTask(user, taskId, "edit");
  if (task.createdById !== user.id && !can(user, "task.deleteAny")) throw new ForbiddenError();
  await db.task.delete({ where: { id: task.id } });
  await db.auditLog.create({ data: { actorId: user.id, action: "DELETE", entity: "Task", entityId: task.id, meta: { title: task.title } } });
}
