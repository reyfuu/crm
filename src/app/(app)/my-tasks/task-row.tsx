"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toggleTaskCompleteAction } from "@/server/actions/tasks";

export type MyTask = {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  boardId: string;
  boardName: string;
};

const priorityTone = { LOW: "slate", MEDIUM: "sky", HIGH: "amber", URGENT: "red" } as const;

export function TaskRow({ task }: { task: MyTask }) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        aria-label={`Tandai "${task.title}" selesai`}
        checked={done}
        onChange={() =>
          startTransition(async () => {
            setDone(true);
            const res = await toggleTaskCompleteAction(task.id);
            if (!res.ok) alert(res.error.message);
          })
        }
        className="size-4 accent-(--primary)"
      />
      <Link href={`/boards/${task.boardId}?task=${task.id}`} className={cn("flex-1 hover:text-primary", done && "text-muted-foreground line-through")}>
        {task.title}
      </Link>
      <Link href={`/boards/${task.boardId}`} className="hidden text-[13px] text-muted-foreground hover:text-primary sm:inline">
        {task.boardName}
      </Link>
      {task.dueDate && <span className="text-[13px] tabular text-muted-foreground">{formatDate(task.dueDate)}</span>}
      <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
    </div>
  );
}
