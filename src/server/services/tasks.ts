import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/action-utils";
import { ForbiddenError } from "@/server/permissions";
import type { CurrentUser } from "@/server/session";
import { POSITION_GAP, needsRebalance, positionBetween } from "@/lib/position";

const TEMPLATES = {
  basic: ["To Do", "In Progress", "Done"],
  review: ["To Do", "In Progress", "Review", "Done"],
} as const;

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, "Nama board wajib diisi").max(100),
  template: z.enum(["basic", "review"]).default("basic"),
  visibility: z.enum(["ALL", "MEMBERS"]).default("ALL"),
});

export const createTaskSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().trim().min(1, "Judul wajib diisi").max(300),
});

export const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  toColumnId: z.string().min(1),
  beforeId: z.string().nullable(),
  afterId: z.string().nullable(),
});

/** Board yang boleh dilihat pengguna (BRL-TASK-2). */
export async function getAccessibleBoard(user: CurrentUser, boardId: string) {
  const board = await db.board.findFirst({ where: { id: boardId, isArchived: false }, include: { members: true } });
  if (!board) return null;
  const isMember = board.members.some((m) => m.userId === user.id);
  const visible = board.visibility === "ALL" || isMember || user.role !== "MEMBER";
  return visible ? { board, isMember } : null;
}

/** Hanya anggota board (atau Admin/Manager) yang boleh mengubah tugas. */
async function assertCanEditBoard(user: CurrentUser, boardId: string) {
  const access = await getAccessibleBoard(user, boardId);
  if (!access) throw new NotFoundError("Board tidak ditemukan.");
  if (!access.isMember && user.role === "MEMBER") throw new ForbiddenError();
  return access.board;
}

export async function createBoard(user: CurrentUser, input: unknown) {
  const data = createBoardSchema.parse(input);
  return db.board.create({
    data: {
      name: data.name,
      visibility: data.visibility,
      ownerId: user.id,
      members: { create: { userId: user.id } },
      columns: {
        create: TEMPLATES[data.template].map((name, i, all) => ({
          name,
          position: (i + 1) * POSITION_GAP,
          isDone: i === all.length - 1,
        })),
      },
    },
  });
}

async function lastTaskPosition(columnId: string) {
  const last = await db.task.findFirst({ where: { columnId }, orderBy: { position: "desc" }, select: { position: true } });
  return last?.position ?? null;
}

async function positionFromNeighbors(columnId: string, beforeId: string | null, afterId: string | null): Promise<number> {
  const ids = [beforeId, afterId].filter(Boolean) as string[];
  const neighbors = await db.task.findMany({ where: { id: { in: ids }, columnId }, select: { id: true, position: true } });
  const before = neighbors.find((n) => n.id === beforeId)?.position ?? null;
  const after = neighbors.find((n) => n.id === afterId)?.position ?? null;

  if (before != null && after != null && needsRebalance(before, after)) {
    const all = await db.task.findMany({ where: { columnId }, orderBy: { position: "asc" }, select: { id: true } });
    await db.$transaction(all.map((t, i) => db.task.update({ where: { id: t.id }, data: { position: (i + 1) * POSITION_GAP } })));
    return positionFromNeighbors(columnId, beforeId, afterId);
  }
  if (before == null && after == null) return positionBetween(await lastTaskPosition(columnId), null);
  return positionBetween(before, after);
}

export async function createTask(user: CurrentUser, input: unknown) {
  const data = createTaskSchema.parse(input);
  const column = await db.boardColumn.findUnique({ where: { id: data.columnId } });
  if (!column) throw new NotFoundError("Kolom tidak ditemukan.");
  await assertCanEditBoard(user, column.boardId);

  return db.task.create({
    data: {
      title: data.title,
      columnId: column.id,
      position: positionBetween(await lastTaskPosition(column.id), null),
      createdById: user.id,
      completedAt: column.isDone ? new Date() : null,
      assignees: { create: { userId: user.id } },
    },
  });
}

export async function moveTask(user: CurrentUser, input: unknown) {
  const data = moveTaskSchema.parse(input);
  const task = await db.task.findUnique({ where: { id: data.taskId }, include: { column: true } });
  if (!task) throw new NotFoundError("Tugas tidak ditemukan.");
  const toColumn = await db.boardColumn.findUnique({ where: { id: data.toColumnId } });
  if (!toColumn || toColumn.boardId !== task.column.boardId) throw new ValidationError("Kolom tujuan tidak valid.");
  await assertCanEditBoard(user, toColumn.boardId);

  const position = await positionFromNeighbors(toColumn.id, data.beforeId, data.afterId);
  await db.task.update({
    where: { id: task.id },
    data: {
      columnId: toColumn.id,
      position,
      // FR-TASK-05: kolom "Done" menandai tugas selesai.
      completedAt: toColumn.isDone ? (task.completedAt ?? new Date()) : null,
    },
  });
}

/** Centang/batal centang dari halaman Tugas Saya: pindah ke kolom Done / kolom pertama. */
export async function toggleTaskComplete(user: CurrentUser, taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { columns: { orderBy: { position: "asc" } } } } } } },
  });
  if (!task) throw new NotFoundError("Tugas tidak ditemukan.");
  await assertCanEditBoard(user, task.column.boardId);

  const columns = task.column.board.columns;
  const target = task.completedAt ? columns.find((c) => !c.isDone) : columns.find((c) => c.isDone);
  if (!target) throw new ValidationError("Board ini belum punya kolom Done.");

  await db.task.update({
    where: { id: task.id },
    data: {
      columnId: target.id,
      position: positionBetween(await lastTaskPosition(target.id), null),
      completedAt: target.isDone ? new Date() : null,
    },
  });
}

