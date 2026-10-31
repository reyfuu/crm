import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { assertCan } from "@/server/permissions";
import { NotFoundError, ValidationError } from "@/server/action-utils";
import type { CurrentUser } from "@/server/session";
import { POSITION_GAP, needsRebalance, positionBetween } from "@/lib/position";
import { formatRupiahShort } from "@/lib/format";

export const createDealSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  value: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  stageId: z.string().min(1, "Pilih tahap"),
  companyId: z.string().optional().transform((v) => v || null),
  contactId: z.string().optional().transform((v) => v || null),
  expectedCloseDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const moveDealSchema = z.object({
  dealId: z.string().min(1),
  toStageId: z.string().min(1),
  beforeId: z.string().nullable(),
  afterId: z.string().nullable(),
  lostReason: z.string().trim().max(500).optional(),
});

async function lastPosition(stageId: string) {
  const last = await db.deal.findFirst({
    where: { stageId, deletedAt: null, status: "OPEN" },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return last?.position ?? null;
}

/** Hitung posisi baru dari kartu tetangga; urutkan ulang kolom bila terlalu rapat (TR-01). */
async function positionFromNeighbors(stageId: string, beforeId: string | null, afterId: string | null): Promise<number> {
  const ids = [beforeId, afterId].filter(Boolean) as string[];
  const neighbors = await db.deal.findMany({ where: { id: { in: ids }, stageId }, select: { id: true, position: true } });
  const before = neighbors.find((n) => n.id === beforeId)?.position ?? null;
  const after = neighbors.find((n) => n.id === afterId)?.position ?? null;

  if (before != null && after != null && needsRebalance(before, after)) {
    const all = await db.deal.findMany({ where: { stageId }, orderBy: { position: "asc" }, select: { id: true } });
    await db.$transaction(all.map((d, i) => db.deal.update({ where: { id: d.id }, data: { position: (i + 1) * POSITION_GAP } })));
    return positionFromNeighbors(stageId, beforeId, afterId);
  }
  if (before == null && after == null) return positionBetween(await lastPosition(stageId), null);
  return positionBetween(before, after);
}

export async function createDeal(user: CurrentUser, input: unknown) {
  const data = createDealSchema.parse(input);
  const stage = await db.stage.findUnique({ where: { id: data.stageId } });
  if (!stage || stage.type !== "OPEN") throw new ValidationError("Deal baru harus berada di tahap terbuka.");

  const deal = await db.deal.create({
    data: {
      title: data.title,
      value: data.value,
      priority: data.priority,
      expectedCloseDate: data.expectedCloseDate,
      stageId: stage.id,
      position: positionBetween(await lastPosition(stage.id), null),
      companyId: data.companyId,
      contactId: data.contactId,
      ownerId: user.id,
    },
  });
  await db.activity.create({
    data: {
      type: "SYSTEM",
      body: `Deal dibuat oleh ${user.name}`,
      dealId: deal.id,
      contactId: deal.contactId,
      companyId: deal.companyId,
    },
  });
  return deal;
}

export async function moveDeal(user: CurrentUser, input: unknown) {
  const data = moveDealSchema.parse(input);
  const deal = await db.deal.findFirst({ where: { id: data.dealId, deletedAt: null }, include: { stage: true } });
  if (!deal) throw new NotFoundError("Deal tidak ditemukan.");
  assertCan(user, "deal.update", deal);

  const toStage = await db.stage.findUnique({ where: { id: data.toStageId } });
  if (!toStage) throw new NotFoundError("Tahap tidak ditemukan.");
  if (toStage.type === "LOST" && !data.lostReason) throw new ValidationError("Alasan Lost wajib diisi.");

  const stageChanged = toStage.id !== deal.stageId;
  const position = await positionFromNeighbors(toStage.id, data.beforeId, data.afterId);
  const status = toStage.type; // OPEN | WON | LOST

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        stageId: toStage.id,
        position,
        status,
        closedAt: status === "OPEN" ? null : new Date(),
        lostReason: status === "LOST" ? data.lostReason : null,
        ...(stageChanged && { stageEnteredAt: new Date() }),
        version: { increment: 1 },
      },
    });
    if (!stageChanged) return;

    await tx.dealStageHistory.create({
      data: { dealId: deal.id, fromStageId: deal.stageId, toStageId: toStage.id, changedById: user.id },
    });
    const body =
      status === "WON"
        ? `Deal ditandai Won oleh ${user.name}`
        : status === "LOST"
          ? `Deal ditandai Lost oleh ${user.name}. Alasan: ${data.lostReason}`
          : `Deal dipindah ${deal.stage.name} → ${toStage.name} oleh ${user.name}`;
    await tx.activity.create({
      data: {
        type: "SYSTEM",
        body,
        authorId: user.id,
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        meta: { fromStageId: deal.stageId, toStageId: toStage.id },
      },
    });
    // FR-NOTIF-06: beri tahu owner bila deal-nya digeser orang lain.
    if (deal.ownerId !== user.id) {
      await tx.notification.create({
        data: {
          userId: deal.ownerId,
          type: "DEAL_CHANGED",
          title: `${user.name}: "${deal.title}" (${formatRupiahShort(deal.value.toString())}) → ${toStage.name}`,
          link: "/deals",
        },
      });
    }
  });
}
