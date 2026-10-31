"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { runAction } from "@/server/action-utils";
import * as svc from "@/server/services/deal-detail";

function refresh() {
  revalidatePath("/deals");
  revalidatePath("/dashboard");
}

export async function getDealDetailAction(dealId: string) {
  const user = await requireUser();
  return runAction(() => svc.getDealDetail(user, dealId));
}

export async function updateDealAction(input: Record<string, unknown>) {
  const user = await requireUser();
  const res = await runAction(() => svc.updateDeal(user, input).then(() => null));
  if (res.ok) refresh();
  return res;
}

export async function deleteDealAction(dealId: string) {
  const user = await requireUser();
  const res = await runAction(() => svc.deleteDeal(user, dealId).then(() => null));
  if (res.ok) refresh();
  return res;
}

export async function addDealNoteAction(input: { dealId: string; type: string; body: string }) {
  const user = await requireUser();
  return runAction(() => svc.addDealNote(user, input).then(() => null));
}

export async function createFollowUpTaskAction(input: { dealId: string; title: string; dueDate?: string }) {
  const user = await requireUser();
  const res = await runAction(() => svc.createFollowUpTask(user, input).then(() => null));
  if (res.ok) {
    refresh();
    revalidatePath("/my-tasks");
  }
  return res;
}
