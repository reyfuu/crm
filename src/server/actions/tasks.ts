"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/session";
import { runAction, type ActionResult } from "@/server/action-utils";
import * as tasks from "@/server/services/tasks";

export async function createBoardAction(_prev: ActionResult<null> | null, formData: FormData) {
  const user = await requireUser();
  const result = await runAction(() => tasks.createBoard(user, Object.fromEntries(formData) as Record<string, string>));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect(`/boards/${result.data.id}`);
}

export async function createTaskAction(input: { columnId: string; title: string }) {
  const user = await requireUser();
  const result = await runAction(() => tasks.createTask(user, input).then(() => null));
  revalidatePath("/boards/[boardId]", "page");
  return result;
}

export async function moveTaskAction(input: { taskId: string; toColumnId: string; beforeId: string | null; afterId: string | null }) {
  const user = await requireUser();
  const result = await runAction(() => tasks.moveTask(user, input).then(() => null));
  revalidatePath("/boards/[boardId]", "page");
  revalidatePath("/my-tasks");
  return result;
}

export async function toggleTaskCompleteAction(taskId: string) {
  const user = await requireUser();
  const result = await runAction(() => tasks.toggleTaskComplete(user, taskId).then(() => null));
  revalidatePath("/my-tasks");
  revalidatePath("/boards/[boardId]", "page");
  return result;
}
