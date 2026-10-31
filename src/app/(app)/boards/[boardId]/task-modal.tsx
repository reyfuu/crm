"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, Link2, Trash2, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskDetail } from "@/server/services/task-detail";
import {
  addChecklistItemAction,
  addCommentAction,
  archiveTaskAction,
  deleteChecklistItemAction,
  deleteCommentAction,
  deleteTaskAction,
  getTaskDetailAction,
  setAssigneesAction,
  toggleChecklistItemAction,
  updateTaskAction,
} from "@/server/actions/task-detail";
import { moveTaskAction } from "@/server/actions/tasks";

type Result = { ok: boolean; error?: { message: string } };

export function TaskModal({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!taskId} onClose={onClose} title="Detail tugas" className="max-w-3xl">
      {taskId && <TaskModalBody key={taskId} taskId={taskId} onClose={onClose} />}
    </Dialog>
  );
}

function TaskModalBody({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () =>
    getTaskDetailAction(taskId).then((res) => {
      if (res.ok) setTask(res.data);
      else setError(res.error.message);
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error?.message ?? "Gagal.");
      else if (after) after();
      else await load();
    });

  if (!task) return error ? <p className="text-danger">{error}</p> : <div className="h-64 animate-pulse rounded bg-surface" />;

  const ro = !task.canEdit;
  const doneCount = task.checklist.filter((i) => i.isDone).length;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_220px]">
      <div className="min-w-0 space-y-5">
        {error && <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

        <input
          defaultValue={task.title}
          disabled={ro}
          aria-label="Judul tugas"
          className={cn(
            "w-full rounded-sm bg-transparent px-1 py-0.5 text-xl font-semibold focus-visible:bg-surface focus-visible:outline-none",
            task.completed && "line-through",
          )}
          onBlur={(e) => {
            const title = e.target.value.trim();
            if (title && title !== task.title) run(() => updateTaskAction({ taskId: task.id, title }));
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <p className="-mt-3 px-1 text-xs text-muted-foreground">
          {task.boardName} · dibuat {task.createdByName}, {formatRelative(task.createdAt)}
        </p>

        <Description task={task} readOnly={ro} pending={pending} onSave={(description) => run(() => updateTaskAction({ taskId: task.id, description }))} />

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Checklist</h3>
            {task.checklist.length > 0 && (
              <span className="text-xs text-muted-foreground tabular">
                {doneCount}/{task.checklist.length}
              </span>
            )}
          </div>
          {task.checklist.length > 0 && (
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-success transition-all" style={{ width: `${(doneCount / task.checklist.length) * 100}%` }} />
            </div>
          )}
          <ul className="space-y-1">
            {task.checklist.map((item) => (
              <li key={item.id} className="group flex items-center gap-2 rounded-sm px-1 py-0.5 hover:bg-surface">
                <input
                  type="checkbox"
                  checked={item.isDone}
                  disabled={ro || pending}
                  onChange={() => run(() => toggleChecklistItemAction(item.id))}
                  className="size-4 accent-(--primary)"
                  aria-label={item.text}
                />
                <span className={cn("flex-1 text-[13px]", item.isDone && "text-muted-foreground line-through")}>{item.text}</span>
                {!ro && (
                  <button
                    type="button"
                    aria-label={`Hapus ${item.text}`}
                    className="invisible rounded-sm p-0.5 text-muted-foreground group-hover:visible hover:text-danger"
                    onClick={() => run(() => deleteChecklistItemAction(item.id))}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!ro && (
            <InlineAdd placeholder="+ Item checklist" pending={pending} onAdd={(text) => run(() => addChecklistItemAction(task.id, text))} />
          )}
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Komentar</h3>
          <ul className="space-y-3">
            {task.comments.map((c) => (
              <li key={c.id} className="group flex gap-2.5">
                <Avatar name={c.authorName} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.authorName}</span> · {formatRelative(c.createdAt)}
                    {(c.authorId === task.currentUserId || task.canDeleteAnyComment) && (
                      <button
                        type="button"
                        className="invisible ml-2 hover:text-danger group-hover:visible"
                        onClick={() => run(() => deleteCommentAction(c.id))}
                      >
                        Hapus
                      </button>
                    )}
                  </p>
                  <p className="text-[13px] whitespace-pre-wrap">{highlightMentions(c.body)}</p>
                </div>
              </li>
            ))}
          </ul>
          {!ro && <CommentForm members={task.members} pending={pending} onSubmit={(body) => run(() => addCommentAction(task.id, body))} />}
        </section>
      </div>

      <aside className="space-y-4 text-[13px]">
        <div>
          <Label htmlFor="t-col">Kolom</Label>
          <Select
            id="t-col"
            defaultValue={task.columnId}
            disabled={ro || pending}
            onChange={(e) =>
              run(() => moveTaskAction({ taskId: task.id, toColumnId: e.target.value, beforeId: null, afterId: null }))
            }
          >
            {task.columns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Assignee</Label>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-sm border border-border p-2">
            {task.members.map((m) => {
              const checked = task.assigneeIds.includes(m.id);
              return (
                <li key={m.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={ro || pending}
                      className="size-4 accent-(--primary)"
                      onChange={() => {
                        const next = checked ? task.assigneeIds.filter((id) => id !== m.id) : [...task.assigneeIds, m.id];
                        run(() => setAssigneesAction(task.id, next));
                      }}
                    />
                    <Avatar name={m.name} size={20} /> <span className="truncate">{m.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <Label htmlFor="t-due">Jatuh tempo</Label>
          <Input
            id="t-due"
            type="date"
            defaultValue={task.dueDate ?? ""}
            disabled={ro || pending}
            onChange={(e) => run(() => updateTaskAction({ taskId: task.id, dueDate: e.target.value || null }))}
          />
          {task.dueDate && <p className="mt-1 text-xs text-muted-foreground">{formatDate(task.dueDate)}</p>}
        </div>

        <div>
          <Label htmlFor="t-prio">Prioritas</Label>
          <Select
            id="t-prio"
            defaultValue={task.priority}
            disabled={ro || pending}
            onChange={(e) => run(() => updateTaskAction({ taskId: task.id, priority: e.target.value }))}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        {task.related && (
          <div>
            <Label>Terkait</Label>
            <Link href={task.related.href} className="flex items-center gap-1 text-primary hover:underline">
              <Link2 className="size-3.5" /> {task.related.label}
            </Link>
          </div>
        )}

        {!ro && (
          <div className="space-y-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" className="w-full" disabled={pending} onClick={() => run(() => archiveTaskAction(task.id), onClose)}>
              <Archive /> Arsipkan
            </Button>
            {task.canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-danger"
                disabled={pending}
                onClick={() => confirm(`Hapus tugas "${task.title}"?`) && run(() => deleteTaskAction(task.id), onClose)}
              >
                <Trash2 /> Hapus
              </Button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Description({
  task,
  readOnly,
  pending,
  onSave,
}: {
  task: TaskDetail;
  readOnly: boolean;
  pending: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.description);

  if (!editing) {
    return (
      <section>
        <h3 className="mb-1 font-semibold">Deskripsi</h3>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setEditing(true)}
          className="block min-h-12 w-full rounded-sm px-1 py-1 text-left text-[13px] whitespace-pre-wrap hover:bg-surface disabled:hover:bg-transparent"
        >
          {task.description || <span className="text-muted-foreground">{readOnly ? "Tidak ada deskripsi." : "Klik untuk menambah deskripsi…"}</span>}
        </button>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Deskripsi</h3>
      <Textarea autoFocus value={value} onChange={(e) => setValue(e.target.value)} className="min-h-28" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => (setValue(task.description), setEditing(false))}>Batal</Button>
        <Button size="sm" disabled={pending} onClick={() => (onSave(value), setEditing(false))}>Simpan</Button>
      </div>
    </section>
  );
}

function InlineAdd({ placeholder, pending, onAdd }: { placeholder: string; pending: boolean; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} disabled={pending} className="h-8" />
    </form>
  );
}

function CommentForm({
  members,
  pending,
  onSubmit,
}: {
  members: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        onSubmit(body.trim());
        setBody("");
      }}
    >
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tulis komentar… ketik @NamaDepan untuk menyebut rekan" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {members.slice(0, 6).map((m) => {
            const tag = "@" + m.name.split(" ")[0];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setBody((b) => (b && !b.endsWith(" ") ? b + " " : b) + tag + " ")}
                className="rounded-sm bg-surface px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {tag}
              </button>
            );
          })}
        </div>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>Kirim</Button>
      </div>
    </form>
  );
}

function highlightMentions(body: string) {
  return body.split(/(@\w+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-primary">{part}</span>
    ) : (
      part
    ),
  );
}
