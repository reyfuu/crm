"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/session";
import { runAction, type ActionResult } from "@/server/action-utils";
import * as contacts from "@/server/services/contacts";

export type CreateContactState = ActionResult<{ duplicate?: contacts.DuplicateHit }> | null;

export async function createContactAction(_prev: CreateContactState, formData: FormData): Promise<CreateContactState> {
  const user = await requireUser();
  const input = Object.fromEntries(formData) as Record<string, string>;
  const result = await runAction(() => contacts.createContact(user, input));
  if (!result.ok) return result;
  if ("duplicate" in result.data && result.data.duplicate) return { ok: true, data: { duplicate: result.data.duplicate } };
  revalidatePath("/contacts");
  redirect(`/contacts/${result.data.contact!.id}`);
}

export async function createActivityAction(_prev: ActionResult<null> | null, formData: FormData) {
  const user = await requireUser();
  const input = Object.fromEntries(formData) as Record<string, string>;
  const result = await runAction(() => contacts.createActivity(user, input).then(() => null));
  if (result.ok) revalidatePath(`/contacts/${input.contactId}`);
  return result;
}
