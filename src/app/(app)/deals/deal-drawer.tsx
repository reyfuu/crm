"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, RotateCcw, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { activityType } from "@/lib/labels";
import { formatDate, formatRelative, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealDetail } from "@/server/services/deal-detail";
import {
  addDealNoteAction,
  createFollowUpTaskAction,
  deleteDealAction,
  getDealDetailAction,
  updateDealAction,
} from "@/server/actions/deal-detail";
import { moveDealAction } from "@/server/actions/deals";
import type { StageData } from "./deals-board";

type Option = { id: string; name: string };
export type DrawerOptions = {
  stages: StageData[];
  companies: Option[];
  contacts: Option[];
  users: Option[];
  lostReasons: string[];
};

export function DealDrawer({ dealId, onClose, options }: { dealId: string | null; onClose: () => void; options: DrawerOptions }) {
  return (
    <Dialog variant="sheet" open={!!dealId} onClose={onClose} title="Detail deal">
      {/* key: state di dalam direset setiap kali deal yang dibuka berganti */}
      {dealId && <DealDrawerBody key={dealId} dealId={dealId} onClose={onClose} options={options} />}
    </Dialog>
  );
}

function DealDrawerBody({ dealId, onClose, options }: { dealId: string; onClose: () => void; options: DrawerOptions }) {
  const [detail, setDetail] = useState<DealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () =>
    getDealDetailAction(dealId).then((res) => {
      if (res.ok) setDetail(res.data);
      else setError(res.error.message);
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Jalankan aksi server, tampilkan error bila gagal, lalu muat ulang detail. */
  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error?.message ?? "Gagal.");
      else if (after) after();
      else await load();
    });

  if (!detail) {
    return error ? <p className="text-danger">{error}</p> : <DrawerSkeleton />;
  }

  const wonStage = options.stages.find((s) => s.type === "WON");
  const lostStage = options.stages.find((s) => s.type === "LOST");
  const firstOpen = options.stages.find((s) => s.type === "OPEN");
  const moveTo = (stageId: string, lostReason?: string) =>
    run(() => moveDealAction({ dealId: detail.id, toStageId: stageId, beforeId: null, afterId: null, lostReason }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{detail.title}</h2>
          <Badge tone={detail.status === "WON" ? "green" : detail.status === "LOST" ? "red" : "indigo"}>{detail.stageName}</Badge>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular">{formatRupiah(detail.value)}</p>
        {detail.lostReason && <p className="mt-1 text-[13px] text-danger">Alasan Lost: {detail.lostReason}</p>}
      </div>

      {error && <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      <StatusActions
        detail={detail}
        lostReasons={options.lostReasons}
        pending={pending}
        onWon={() => wonStage && moveTo(wonStage.id)}
        onLost={(reason) => lostStage && moveTo(lostStage.id, reason)}
        onReopen={() => firstOpen && moveTo(firstOpen.id)}
        onDelete={() => {
          if (confirm(`Hapus deal "${detail.title}"?`)) run(() => deleteDealAction(detail.id), onClose);
        }}
      />

      <EditForm detail={detail} options={options} pending={pending} onSave={(input) => run(() => updateDealAction(input))} />

      <FollowUp detail={detail} pending={pending} onCreate={(input) => run(() => createFollowUpTaskAction({ dealId: detail.id, ...input }))} />

      <section>
        <h3 className="mb-2 font-semibold">Timeline</h3>
        <NoteForm pending={pending} onSubmit={(type, body) => run(() => addDealNoteAction({ dealId: detail.id, type, body }))} />
        <ol className="mt-4 space-y-3">
          {detail.activities.map((a) => (
            <li key={a.id} className="flex gap-3 text-[13px]">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.type === "SYSTEM" ? "bg-border" : "bg-primary")} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {activityType[a.type as keyof typeof activityType]}
                  {a.authorName && a.type !== "SYSTEM" && ` · ${a.authorName}`} · <time title={formatDate(a.occurredAt)}>{formatRelative(a.occurredAt)}</time>
                </p>
                <p className={cn("whitespace-pre-wrap", a.type === "SYSTEM" && "text-muted-foreground")}>{a.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {detail.history.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Histori tahap</h3>
          <ul className="space-y-1 text-[13px] text-muted-foreground">
            {detail.history.map((h) => (
              <li key={h.id}>
                {h.from ?? "—"} → <span className="font-medium text-foreground">{h.to}</span> · {h.by} · {formatRelative(h.at)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusActions({
  detail,
  lostReasons,
  pending,
  onWon,
  onLost,
  onReopen,
  onDelete,
}: {
  detail: DealDetail;
  lostReasons: string[];
  pending: boolean;
  onWon: () => void;
  onLost: (reason: string) => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const [showLost, setShowLost] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {detail.status === "OPEN" ? (
          <>
            <Button variant="secondary" size="sm" disabled={pending} onClick={onWon}>
              <CircleCheck className="text-success" /> Won
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setShowLost((v) => !v)}>
              <CircleX className="text-danger" /> Lost
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" disabled={pending} onClick={onReopen}>
            <RotateCcw /> Buka kembali
          </Button>
        )}
        {detail.canDelete && (
          <Button variant="ghost" size="sm" className="ml-auto text-danger" disabled={pending} onClick={onDelete}>
            <Trash2 /> Hapus
          </Button>
        )}
      </div>
      {showLost && detail.status === "OPEN" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason) onLost(reason);
          }}
        >
          <Select value={reason} onChange={(e) => setReason(e.target.value)} required aria-label="Alasan Lost">
            <option value="">Pilih alasan Lost…</option>
            {lostReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <Button type="submit" variant="destructive" size="default" disabled={pending || !reason}>
            Tandai Lost
          </Button>
        </form>
      )}
    </div>
  );
}

function EditForm({
  detail,
  options,
  pending,
  onSave,
}: {
  detail: DealDetail;
  options: DrawerOptions;
  pending: boolean;
  onSave: (input: Record<string, unknown>) => void;
}) {
  const [dirty, setDirty] = useState(false);
  return (
    <form
      className="space-y-3 rounded-lg border border-border p-4"
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        const input = Object.fromEntries(new FormData(e.currentTarget));
        onSave({ ...input, dealId: detail.id, version: detail.version, ownerId: input.ownerId ?? detail.ownerId });
        setDirty(false);
      }}
    >
      <div>
        <Label htmlFor="d-title">Judul</Label>
        <Input id="d-title" name="title" defaultValue={detail.title} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="d-value">Nilai (Rp)</Label>
          <Input id="d-value" name="value" type="number" min={0} step={1000} defaultValue={detail.value} />
        </div>
        <div>
          <Label htmlFor="d-priority">Prioritas</Label>
          <Select id="d-priority" name="priority" defaultValue={detail.priority}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="d-company">Perusahaan</Label>
          <Select id="d-company" name="companyId" defaultValue={detail.companyId ?? ""}>
            <option value="">—</option>
            {options.companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="d-contact">Kontak</Label>
          <Select id="d-contact" name="contactId" defaultValue={detail.contactId ?? ""}>
            <option value="">—</option>
            {options.contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="d-close">Perkiraan closing</Label>
          <Input id="d-close" name="expectedCloseDate" type="date" defaultValue={detail.expectedCloseDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="d-owner">Owner</Label>
          <Select id="d-owner" name="ownerId" defaultValue={detail.ownerId} disabled={!detail.canChangeOwner}>
            {options.users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
          {!detail.canChangeOwner && <p className="mt-1 text-xs text-muted-foreground">Hanya Admin/Manager yang bisa mengganti owner.</p>}
        </div>
      </div>
      {detail.contactId && (
        <Link href={`/contacts/${detail.contactId}`} className="inline-block text-[13px] text-primary hover:underline">
          Buka kontak {detail.contactName} →
        </Link>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          Simpan perubahan
        </Button>
      </div>
    </form>
  );
}

function FollowUp({
  detail,
  pending,
  onCreate,
}: {
  detail: DealDetail;
  pending: boolean;
  onCreate: (input: { title: string; dueDate?: string }) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 font-semibold">Tugas ({detail.tasks.filter((t) => !t.completed).length} terbuka)</h3>
      <ul className="mb-3 space-y-1 text-[13px]">
        {detail.tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", t.completed ? "bg-success" : "bg-warning")} />
            <Link href={`/boards/${t.boardId}?task=${t.id}`} className={cn("flex-1 hover:text-primary", t.completed && "text-muted-foreground line-through")}>
              {t.title}
            </Link>
            {t.dueDate && <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          onCreate({ title: String(data.get("title")), dueDate: String(data.get("dueDate") || "") || undefined });
          form.reset();
        }}
      >
        <Input name="title" placeholder="Tugas follow-up baru…" required />
        <Input name="dueDate" type="date" className="w-40" aria-label="Jatuh tempo" />
        <Button type="submit" size="default" variant="secondary" disabled={pending}>Tambah</Button>
      </form>
    </section>
  );
}

function NoteForm({ pending, onSubmit }: { pending: boolean; onSubmit: (type: string, body: string) => void }) {
  const [error, setError] = useState<string>();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const body = String(data.get("body") ?? "").trim();
        if (!body) return setError("Isi catatan");
        setError(undefined);
        onSubmit(String(data.get("type")), body);
        form.reset();
      }}
    >
      <Textarea name="body" placeholder="Catat hasil telepon, meeting, atau catatan…" />
      <FieldError message={error} />
      <div className="flex justify-end gap-2">
        <Select name="type" defaultValue="NOTE" className="w-36" aria-label="Tipe aktivitas">
          {Object.entries(activityType)
            .filter(([k]) => k !== "SYSTEM")
            .map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
        </Select>
        <Button type="submit" size="default" disabled={pending}>Catat</Button>
      </div>
    </form>
  );
}

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Memuat">
      <div className="h-6 w-2/3 rounded bg-surface" />
      <div className="h-8 w-1/3 rounded bg-surface" />
      <div className="h-40 rounded bg-surface" />
      <div className="h-24 rounded bg-surface" />
    </div>
  );
}
