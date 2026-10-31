"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { runAction } from "@/server/action-utils";
import * as svc from "@/server/services/task-detail";

function refresh() {
  revalidatePath("/boards/[boardId]", "page");
  revalidatePath("/my-tasks");
}

/** Jalankan mutasi lalu refresh board & Tugas Saya. */
async function mutate(fn: (user: Awaited<ReturnType<typeof requireUser>>) => Promise<unknown>) {
  const user = await requireUser();
  const res = await runAction(() => fn(user).then(() => null));
  if (res.ok) refresh();
  return res;
}

export async function getTaskDetailAction(taskId: string) {
  const user = await requireUser();
  return runAction(() => svc.getTaskDetail(user, taskId));
}

export async function updateTaskAction(input: {
  taskId: string;
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
}) {
  return mutate((u) => svc.updateTask(u, input));
}

export async function setAssigneesAction(taskId: string, userIds: string[]) {
  return mutate((u) => svc.setAssignees(u, { taskId, userIds }));
}

export async function addChecklistItemAction(taskId: string, text: string) {
  return mutate((u) => svc.addChecklistItem(u, taskId, text));
}

export async function toggleChecklistItemAction(itemId: string) {
  return mutate((u) => svc.toggleChecklistItem(u, itemId));
}

export async function deleteChecklistItemAction(itemId: string) {
  return mutate((u) => svc.deleteChecklistItem(u, itemId));
}

export async function addCommentAction(taskId: string, body: string) {
  return mutate((u) => svc.addComment(u, taskId, body));
}

export async function deleteCommentAction(commentId: string) {
  return mutate((u) => svc.deleteComment(u, commentId));
}

export async function archiveTaskAction(taskId: string) {
  return mutate((u) => svc.archiveTask(u, taskId));
}

export async function deleteTaskAction(taskId: string) {
  return mutate((u) => svc.deleteTask(u, taskId));
}
