"use client";

import { useMemo, useState, useTransition } from "react";
import { isPast, isToday } from "date-fns";
import { CalendarDays, CircleCheck, Link2, MessageSquare, Paperclip, Plus, SquareCheck } from "lucide-react";
import { KanbanBoard, type KanbanColumn, type KanbanMove } from "@/components/kanban/kanban-board";
import { Avatar, Badge } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createTaskAction, moveTaskAction } from "@/server/actions/tasks";
import { TaskModal } from "./task-modal";

export type ColumnData = { id: string; name: string; isDone: boolean; wipLimit: number | null };
export type TaskCardData = {
  id: string;
  columnId: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  completed: boolean;
  assignees: string[];
  labels: { name: string; color: string }[];
  comments: number;
  attachments: number;
  checklistDone: number;
  checklistTotal: number;
  related: string | null;
};

const priorityTone = { LOW: "slate", MEDIUM: "sky", HIGH: "amber", URGENT: "red" } as const;
const priorityLabel = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export function TaskBoard({
  columns,
  tasks,
  canEdit,
  initialTaskId,
}: {
  columns: ColumnData[];
  tasks: TaskCardData[];
  canEdit: boolean;
  initialTaskId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(initialTaskId ?? null);

  const kanbanColumns = useMemo<KanbanColumn<TaskCardData>[]>(
    () =>
      columns.map((c) => {
        const items = tasks.filter((t) => t.columnId === c.id);
        const overWip = c.wipLimit != null && items.length > c.wipLimit;
        return {
          id: c.id,
          title: c.name,
          items,
          warn: overWip,
          icon: c.isDone ? <CircleCheck className="size-4 text-success" /> : undefined,
          header: c.wipLimit != null && (
            <p className={cn("mt-0.5 text-xs", overWip ? "font-medium text-warning" : "text-muted-foreground")}>
              WIP {items.length}/{c.wipLimit}
            </p>
          ),
          footer: canEdit && !c.isDone ? <QuickAdd columnId={c.id} onError={setError} /> : undefined,
        };
      }),
    [columns, tasks, canEdit],
  );

  async function handleMove(move: KanbanMove) {
    setError(null);
    const res = await moveTaskAction({
      taskId: move.itemId,
      toColumnId: move.toColumnId,
      beforeId: move.beforeId,
      afterId: move.afterId,
    });
    if (!res.ok) setError(`Gagal memindahkan: ${res.error.message}`);
    return res.ok;
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}
      <KanbanBoard columns={kanbanColumns} onMove={handleMove} canDrag={() => canEdit}
        onOpen={(t) => setOpenTaskId(t.id)}
        renderCard={(t) => <TaskCard task={t} />}
      />
      <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}

function TaskCard({ task }: { task: TaskCardData }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && !task.completed && isPast(due) && !isToday(due);
  const dueToday = due && !task.completed && isToday(due);
  return (
    <article
      className={cn(
        "rounded-md border border-border bg-card p-3 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)",
        task.completed && "opacity-70",
      )}
    >
      <div className="mb-1.5 flex flex-wrap gap-1">
        {task.labels.map((l) => (
          <Badge key={l.name}>{l.name}</Badge>
        ))}
        {task.priority !== "MEDIUM" && <Badge tone={priorityTone[task.priority]}>{priorityLabel[task.priority]}</Badge>}
      </div>
      <h4 className={cn("text-[14px] font-medium", task.completed && "line-through")}>{task.title}</h4>
      {task.related && (
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Link2 className="size-3" /> {task.related}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {task.checklistTotal > 0 && (
          <span className="inline-flex items-center gap-1">
            <SquareCheck className="size-3.5" /> {task.checklistDone}/{task.checklistTotal}
          </span>
        )}
        {task.comments > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" /> {task.comments}
          </span>
        )}
        {task.attachments > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3.5" /> {task.attachments}
          </span>
        )}
        {due && (
          <span className={cn("inline-flex items-center gap-1", overdue && "text-danger", dueToday && "text-warning")}>
            <CalendarDays className="size-3.5" /> {dueToday ? "Hari ini" : formatDate(due)}
          </span>
        )}
        <span className="ml-auto flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((n) => (
            <Avatar key={n} name={n} />
          ))}
        </span>
      </div>
    </article>
  );
}

function QuickAdd({ columnId, onError }: { columnId: string; onError: (msg: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-card hover:text-foreground"
      >
        <Plus className="size-4" /> Tambah tugas
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const res = await createTaskAction({ columnId, title });
          if (res.ok) setTitle("");
          else onError(res.error.message);
        });
      }}
    >
      <Input
        autoFocus
        value={title}
        disabled={pending}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Judul tugas, lalu Enter"
      />
    </form>
  );
}
