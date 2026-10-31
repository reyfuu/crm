"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { runAction } from "@/server/action-utils";
import * as users from "@/server/services/users";

function refresh() {
  revalidatePath("/settings/users");
  revalidatePath("/settings");
}

export async function createUserAction(input: Record<string, unknown>) {
  const actor = await requireUser();
  const result = await runAction(async () => {
    const user = await users.createUser(actor, input);
    return { id: user.id };
  });
  if (result.ok) refresh();
  return result;
}

export async function updateUserAction(input: Record<string, unknown>) {
  const actor = await requireUser();
  const result = await runAction(() => users.updateUser(actor, input).then(() => null));
  if (result.ok) {
    refresh();
    // Nama/peran tampil di header & sidebar semua halaman.
    revalidatePath("/", "layout");
  }
  return result;
}

export async function resetPasswordAction(input: { id: string; password: string }) {
  const actor = await requireUser();
  return runAction(() => users.resetPassword(actor, input).then(() => null));
}

export async function deleteUserAction(id: string) {
  const actor = await requireUser();
  const result = await runAction(() => users.deleteUser(actor, id).then(() => null));
  if (result.ok) refresh();
  return result;
}
