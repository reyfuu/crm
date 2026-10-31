import "server-only";
import { z } from "zod";
import { format } from "date-fns";
import { db } from "@/server/db";
import { assertCan, can } from "@/server/permissions";
import { NotFoundError, ValidationError } from "@/server/action-utils";
import type { CurrentUser } from "@/server/session";
import { positionBetween } from "@/lib/position";

export type DealDetail = {
  id: string;
  title: string;
  value: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "WON" | "LOST";
  stageId: string;
  stageName: string;
  expectedCloseDate: string | null; // yyyy-MM-dd untuk <input type="date">
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  ownerId: string;
  ownerName: string;
  lostReason: string | null;
  version: number;
  createdAt: string;
  activities: { id: string; type: string; body: string; authorName: string | null; occurredAt: string }[];
  history: { id: string; from: string | null; to: string; by: string; at: string }[];
  tasks: { id: string; title: string; completed: boolean; dueDate: string | null; boardId: string }[];
  canChangeOwner: boolean;
  canDelete: boolean;
};

const fullName = (c: { firstName: string; lastName: string | null }) => [c.firstName, c.lastName].filter(Boolean).join(" ");

export async function getDealDetail(user: CurrentUser, dealId: string): Promise<DealDetail> {
  const deal = await db.deal.findFirst({
    where: { id: dealId, deletedAt: null },
    include: {
      stage: true,
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
      owner: { select: { name: true } },
      activities: { orderBy: { occurredAt: "desc" }, take: 50 },
      history: { orderBy: { changedAt: "desc" }, take: 30 },
      tasks: {
        where: { isArchived: false },
        orderBy: { createdAt: "desc" },
        include: { column: { select: { boardId: true } } },
      },
    },
  });
  if (!deal) throw new NotFoundError("Deal tidak ditemukan.");

  const userIds = new Set<string>([
    ...(deal.activities.map((a) => a.authorId).filter(Boolean) as string[]),
    ...deal.history.map((h) => h.changedById),
  ]);
  const [users, stages] = await Promise.all([
    db.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } }),
    db.stage.findMany({ select: { id: true, name: true } }),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const stageName = new Map(stages.map((s) => [s.id, s.name]));

  return {
    id: deal.id,
    title: deal.title,
    value: deal.value.toString(),
    priority: deal.priority,
    status: deal.status,
    stageId: deal.stageId,
    stageName: deal.stage.name,
    expectedCloseDate: deal.expectedCloseDate ? format(deal.expectedCloseDate, "yyyy-MM-dd") : null,
    companyId: deal.companyId,
    companyName: deal.company?.name ?? null,
    contactId: deal.contactId,
    contactName: deal.contact ? fullName(deal.contact) : null,
    ownerId: deal.ownerId,
    ownerName: deal.owner.name,
    lostReason: deal.lostReason,
    version: deal.version,
    createdAt: deal.createdAt.toISOString(),
    activities: deal.activities.map((a) => ({
      id: a.id,
      type: a.type,
      body: a.body,
      authorName: a.authorId ? userName.get(a.authorId) ?? null : null,
      occurredAt: a.occurredAt.toISOString(),
    })),
    history: deal.history.map((h) => ({
      id: h.id,
      from: h.fromStageId ? stageName.get(h.fromStageId) ?? "?" : null,
      to: stageName.get(h.toStageId) ?? "?",
      by: userName.get(h.changedById) ?? "?",
      at: h.changedAt.toISOString(),
    })),
    tasks: deal.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      completed: !!t.completedAt,
      dueDate: t.dueDate?.toISOString() ?? null,
      boardId: t.column.boardId,
    })),
    canChangeOwner: can(user, "deal.changeOwner"),
    canDelete: can(user, "deal.delete"),
  };
}

const optionalId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v || null);

export const updateDealSchema = z.object({
  dealId: z.string().min(1),
  version: z.coerce.number().int(),
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  value: z.coerce.number().min(0, "Nilai tidak boleh negatif"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  expectedCloseDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  companyId: optionalId,
  contactId: optionalId,
  ownerId: z.string().min(1),
});

export async function updateDeal(user: CurrentUser, input: unknown) {
  const data = updateDealSchema.parse(input);
  const deal = await db.deal.findFirst({ where: { id: data.dealId, deletedAt: null }, include: { owner: true } });
  if (!deal) throw new NotFoundError("Deal tidak ditemukan.");
  assertCan(user, "deal.update", deal);

  const ownerChanged = data.ownerId !== deal.ownerId;
  if (ownerChanged) assertCan(user, "deal.changeOwner");

  // TR-06: tolak bila deal sudah diubah orang lain sejak form dibuka.
  const updated = await db.deal.updateMany({
    where: { id: deal.id, version: data.version },
    data: {
      title: data.title,
      value: data.value,
      priority: data.priority,
      expectedCloseDate: data.expectedCloseDate,
      companyId: data.companyId,
      contactId: data.contactId,
      ownerId: data.ownerId,
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) throw new ValidationError("Deal ini baru saja diubah orang lain. Tutup lalu buka lagi untuk melihat data terbaru.");

  if (ownerChanged) {
    const newOwner = await db.user.findUniqueOrThrow({ where: { id: data.ownerId } });
    await db.activity.create({
      data: {
        type: "SYSTEM",
        body: `Owner diganti dari ${deal.owner.name} ke ${newOwner.name} oleh ${user.name}`,
        authorId: user.id,
        dealId: deal.id,
      },
    });
    // FR-NOTIF-04
    if (newOwner.id !== user.id) {
      await db.notification.create({
        data: { userId: newOwner.id, type: "OWNER_CHANGED", title: `Anda sekarang owner deal "${data.title}"`, link: `/deals?deal=${deal.id}` },
      });
    }
  } else if (deal.ownerId !== user.id) {
    // FR-NOTIF-06: deal diubah orang lain
    await db.notification.create({
      data: { userId: deal.ownerId, type: "DEAL_CHANGED", title: `${user.name} mengubah deal "${data.title}"`, link: `/deals?deal=${deal.id}` },
    });
  }
}

export async function deleteDeal(user: CurrentUser, dealId: string) {
  assertCan(user, "deal.delete");
  const deal = await db.deal.findFirst({ where: { id: dealId, deletedAt: null } });
  if (!deal) throw new NotFoundError("Deal tidak ditemukan.");
  await db.deal.update({ where: { id: deal.id }, data: { deletedAt: new Date() } });
  await db.auditLog.create({ data: { actorId: user.id, action: "DELETE", entity: "Deal", entityId: deal.id, meta: { title: deal.title } } });
}

export const dealNoteSchema = z.object({
  dealId: z.string().min(1),
  type: z.enum(["NOTE", "CALL", "MEETING", "EMAIL", "WHATSAPP", "OTHER"]),
  body: z.string().trim().min(1, "Isi catatan").max(5000),
});

export async function addDealNote(user: CurrentUser, input: unknown) {
  const data = dealNoteSchema.parse(input);
  const deal = await db.deal.findFirst({ where: { id: data.dealId, deletedAt: null } });
  if (!deal) throw new NotFoundError("Deal tidak ditemukan.");
  await db.activity.create({
    data: { type: data.type, body: data.body, authorId: user.id, dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId },
  });
}

export const followUpSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().trim().min(1, "Judul tugas wajib diisi").max(300),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
});

/** FR-TASK-12: tugas follow-up masuk ke board sistem "Follow-up Sales". */
export async function createFollowUpTask(user: CurrentUser, input: unknown) {
  const data = followUpSchema.parse(input);
  const deal = await db.deal.findFirst({ where: { id: data.dealId, deletedAt: null } });
  if (!deal) throw new NotFoundError("Deal tidak ditemukan.");
  const board = await db.board.findFirst({
    where: { isSystem: true },
    include: { columns: { where: { isDone: false }, orderBy: { position: "asc" }, take: 1 } },
  });
  const column = board?.columns[0];
  if (!board || !column) throw new ValidationError("Board Follow-up Sales tidak ditemukan.");

  const last = await db.task.findFirst({ where: { columnId: column.id }, orderBy: { position: "desc" }, select: { position: true } });
  await db.$transaction([
    db.boardMember.upsert({
      where: { boardId_userId: { boardId: board.id, userId: user.id } },
      create: { boardId: board.id, userId: user.id },
      update: {},
    }),
    db.task.create({
      data: {
        title: data.title,
        dueDate: data.dueDate,
        columnId: column.id,
        position: positionBetween(last?.position ?? null, null),
        createdById: user.id,
        dealId: deal.id,
        contactId: deal.contactId,
        assignees: { create: { userId: user.id } },
      },
    }),
  ]);
}
