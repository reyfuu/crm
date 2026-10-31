"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { runAction } from "@/server/action-utils";
import * as deals from "@/server/services/deals";

export async function createDealAction(input: Record<string, string>) {
  const user = await requireUser();
  const result = await runAction(async () => {
    const deal = await deals.createDeal(user, input);
    return { id: deal.id };
  });
  if (result.ok) revalidatePath("/deals");
  return result;
}

export async function moveDealAction(input: {
  dealId: string;
  toStageId: string;
  beforeId: string | null;
  afterId: string | null;
  lostReason?: string;
}) {
  const user = await requireUser();
  const result = await runAction(() => deals.moveDeal(user, input).then(() => null));
  revalidatePath("/deals");
  return result;
}
