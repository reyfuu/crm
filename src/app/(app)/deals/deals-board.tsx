"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { differenceInDays, isPast } from "date-fns";
import { CalendarDays, CheckSquare, CircleCheck, CircleX, Hourglass, Plus } from "lucide-react";
import { KanbanBoard, type KanbanColumn, type KanbanMove } from "@/components/kanban/kanban-board";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { formatDate, formatRupiah, formatRupiahShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createDealAction, moveDealAction } from "@/server/actions/deals";
import { DealDrawer } from "./deal-drawer";

export type StageData = { id: string; name: string; type: "OPEN" | "WON" | "LOST"; probability: number; rottingDays: number };
export type DealCardData = {
  id: string;
  title: string;
  value: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  stageId: string;
  stageEnteredAt: string;
  expectedCloseDate: string | null;
  companyName: string | null;
  contactName: string | null;
  ownerName: string;
  openTasks: number;
};
type Option = { id: string; name: string };

const priorityDot = { LOW: "bg-slate-400", MEDIUM: "bg-sky-500", HIGH: "bg-amber-500", URGENT: "bg-red-600" };
const priorityLabel = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export function DealsBoard({
  stages,
  deals,
  lostReasons,
  companies,
  contacts,
  users,
  initialDealId,
}: {
  stages: StageData[];
  deals: DealCardData[];
  lostReasons: string[];
  companies: Option[];
  contacts: Option[];
  users: Option[];
  initialDealId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(initialDealId ?? null);
  const drawerOptions = useMemo(
    () => ({ stages, companies, contacts, users, lostReasons }),
    [stages, companies, contacts, users, lostReasons],
  );
  const [lostOpen, setLostOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const lostResolver = useRef<((reason: string | null) => void) | null>(null);
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const columns = useMemo<KanbanColumn<DealCardData>[]>(
    () =>
      stages.map((s) => {
        const items = deals.filter((d) => d.stageId === s.id);
        const total = items.reduce((sum, d) => sum + Number(d.value), 0);
        return {
          id: s.id,
          title: s.name,
          items,
          dropOnly: s.type !== "OPEN",
          icon:
            s.type === "WON" ? <CircleCheck className="size-5 text-success" /> : s.type === "LOST" ? <CircleX className="size-5 text-danger" /> : undefined,
          header: (
            <div className="mt-1 space-y-1.5">
              <p className="text-xs text-muted-foreground tabular">
                {formatRupiahShort(total)} · tertimbang {formatRupiahShort((total * s.probability) / 100)}
              </p>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-primary/60" style={{ width: `${s.probability}%` }} />
              </div>
            </div>
          ),
        };
      }),
    [stages, deals],
  );

  // Minta alasan lewat modal, lalu lanjutkan pemindahan.
  const askLostReason = () =>
    new Promise<string | null>((resolve) => {
      lostResolver.current = resolve;
      setLostOpen(true);
    });

  async function handleMove(move: KanbanMove) {
    setError(null);
    let lostReason: string | undefined;
    if (stageById.get(move.toColumnId)?.type === "LOST") {
      const reason = await askLostReason();
      if (!reason) return false;
      lostReason = reason;
    }
    const res = await moveDealAction({
      dealId: move.itemId,
      toStageId: move.toColumnId,
      beforeId: move.beforeId,
      afterId: move.afterId,
      lostReason,
    });
    if (!res.ok) setError(`Gagal memindahkan: ${res.error.message}`);
    return res.ok;
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Deal
        </Button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      <KanbanBoard
        columns={columns}
        onMove={handleMove}
        onOpen={(d) => setOpenDealId(d.id)}
        renderCard={(d) => <DealCard deal={d} rottingDays={stageById.get(d.stageId)?.rottingDays ?? 14} />}
      />

      <LostDialog
        open={lostOpen}
        reasons={lostReasons}
        onDone={(reason) => {
          setLostOpen(false);
          lostResolver.current?.(reason);
          lostResolver.current = null;
        }}
      />
      <DealDrawer dealId={openDealId} onClose={() => setOpenDealId(null)} options={drawerOptions} />
      <CreateDealDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stages={stages.filter((s) => s.type === "OPEN")}
        companies={companies}
        contacts={contacts}
      />
    </>
  );
}

function DealCard({ deal, rottingDays }: { deal: DealCardData; rottingDays: number }) {
  const overdue = deal.expectedCloseDate && isPast(new Date(deal.expectedCloseDate));
  const rotting = differenceInDays(new Date(), new Date(deal.stageEnteredAt)) > rottingDays;
  return (
    <article className="rounded-md border border-border bg-card p-3 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)">
      <div className="flex items-start gap-2">
        <h4 className="line-clamp-2 flex-1 text-[14px] font-semibold">{deal.title}</h4>
        <span title={priorityLabel[deal.priority]} className={cn("mt-1.5 size-2 shrink-0 rounded-full", priorityDot[deal.priority])} />
      </div>
      {(deal.companyName || deal.contactName) && (
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {[deal.companyName, deal.contactName].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="mt-1.5 font-semibold tabular">{formatRupiah(deal.value)}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {deal.expectedCloseDate && (
          <span className={cn("inline-flex items-center gap-1", overdue && "text-danger")}>
            <CalendarDays className="size-3.5" /> {formatDate(deal.expectedCloseDate)}
          </span>
        )}
        {deal.openTasks > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="size-3.5" /> {deal.openTasks}
          </span>
        )}
        {rotting && (
          <span className="inline-flex items-center gap-1 text-warning" title="Belum pindah tahap terlalu lama">
            <Hourglass className="size-3.5" /> macet
          </span>
        )}
        <span className="ml-auto">
          <Avatar name={deal.ownerName} />
        </span>
      </div>
    </article>
  );
}

function LostDialog({ open, reasons, onDone }: { open: boolean; reasons: string[]; onDone: (reason: string | null) => void }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const close = (value: string | null) => {
    onDone(value);
    setReason("");
    setNote("");
  };
  return (
    <Dialog open={open} onClose={() => close(null)} title="Tandai deal sebagai Lost">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) close(note ? `${reason} — ${note}` : reason);
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="lost-reason">Alasan *</Label>
          <Select id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
            <option value="">Pilih alasan…</option>
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
            <option>Lainnya</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="lost-note">Catatan</Label>
          <Textarea id="lost-note" value={note} onChange={(e) => setNote(e.target.value)} required={reason === "Lainnya"} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => close(null)}>Batal</Button>
          <Button type="submit" variant="destructive">Tandai Lost</Button>
        </div>
      </form>
    </Dialog>
  );
}

function CreateDealDialog({
  open,
  onClose,
  stages,
  companies,
  contacts,
}: {
  open: boolean;
  onClose: () => void;
  stages: StageData[];
  companies: Option[];
  contacts: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Dialog open={open} onClose={onClose} title="Deal baru">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const input = Object.fromEntries(new FormData(form)) as Record<string, string>;
          startTransition(async () => {
            const res = await createDealAction(input);
            if (res.ok) {
              form.reset();
              setErrors({});
              setMessage(null);
              onClose();
            } else {
              setErrors(res.error.fields ?? {});
              setMessage(res.error.message);
            }
          });
        }}
      >
        <div>
          <Label htmlFor="title">Judul *</Label>
          <Input id="title" name="title" required autoFocus />
          <FieldError message={errors.title} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="value">Nilai (Rp)</Label>
            <Input id="value" name="value" type="number" min={0} step={1000} defaultValue={0} />
            <FieldError message={errors.value} />
          </div>
          <div>
            <Label htmlFor="stageId">Tahap *</Label>
            <Select id="stageId" name="stageId" defaultValue={stages[0]?.id}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="companyId">Perusahaan</Label>
            <Select id="companyId" name="companyId" defaultValue="">
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="contactId">Kontak</Label>
            <Select id="contactId" name="contactId" defaultValue="">
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="expectedCloseDate">Perkiraan closing</Label>
            <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
          </div>
          <div>
            <Label htmlFor="priority">Prioritas</Label>
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              {Object.entries(priorityLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </div>
        {message && <p className="text-[13px] text-danger">{message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
