"use client";

import { useId, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export type KanbanColumn<T> = {
  id: string;
  title: string;
  items: T[];
  /** Kolom ramping tanpa kartu, hanya zona jatuh (mis. Won / Lost). */
  dropOnly?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  warn?: boolean;
};

export type KanbanMove = {
  itemId: string;
  fromColumnId: string;
  toColumnId: string;
  /** Kartu di atas & di bawah posisi baru; server menghitung posisi dari keduanya. */
  beforeId: string | null;
  afterId: string | null;
};

type Props<T extends { id: string }> = {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => React.ReactNode;
  /** Kembalikan false untuk membatalkan (kartu kembali ke posisi semula). */
  onMove: (move: KanbanMove) => Promise<boolean>;
  canDrag?: (item: T) => boolean;
  /** Dipanggil saat kartu diklik atau ditekan Enter (membuka detail). */
  onOpen?: (item: T) => void;
};

type ItemMap<T> = Record<string, T[]>;
const toMap = <T,>(cols: KanbanColumn<T>[]): ItemMap<T> =>
  Object.fromEntries(cols.map((c) => [c.id, c.dropOnly ? [] : c.items]));

export function KanbanBoard<T extends { id: string }>({ columns, renderCard, onMove, canDrag, onOpen }: Props<T>) {
  const dndId = useId();
  const [items, setItems] = useState<ItemMap<T>>(() => toMap(columns));
  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshot = useRef<{ map: ItemMap<T>; from: string } | null>(null);

  // Data baru dari server (setelah revalidasi) menggantikan state lokal.
  const [prevColumns, setPrevColumns] = useState(columns);
  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setItems(toMap(columns));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    // Spasi untuk mengangkat/menjatuhkan; Enter dipakai untuk membuka detail kartu.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const columnById = (id: string) => columns.find((c) => c.id === id);
  const findContainer = (id: UniqueIdentifier, map = items): string | undefined => {
    const key = String(id);
    if (key in map) return key;
    return Object.keys(map).find((col) => map[col]!.some((i) => i.id === key));
  };
  const activeItem = activeId
    ? Object.values(items).flat().find((i) => i.id === activeId) ?? null
    : null;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    snapshot.current = { map: items, from: findContainer(active.id)! };
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to || columnById(to)?.dropOnly) return;

    setItems((prev) => {
      const source = prev[from]!;
      const target = prev[to]!;
      const moving = source.find((i) => i.id === active.id);
      if (!moving) return prev;
      const overIndex = target.findIndex((i) => i.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : target.length;
      return {
        ...prev,
        [from]: source.filter((i) => i.id !== active.id),
        [to]: [...target.slice(0, insertAt), moving, ...target.slice(insertAt)],
      };
    });
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const snap = snapshot.current;
    snapshot.current = null;
    if (!over || !snap) {
      if (snap) setItems(snap.map);
      return;
    }

    const itemId = String(active.id);
    const overCol = findContainer(over.id);
    if (!overCol) return setItems(snap.map);

    // Jatuh ke kolom zona (Won/Lost): kartu langsung keluar dari board.
    if (columnById(overCol)?.dropOnly) {
      const current = findContainer(itemId)!;
      setItems((prev) => ({ ...prev, [current]: prev[current]!.filter((i) => i.id !== itemId) }));
      const ok = await onMove({ itemId, fromColumnId: snap.from, toColumnId: overCol, beforeId: null, afterId: null });
      if (!ok) setItems(snap.map);
      return;
    }

    const col = findContainer(itemId)!;
    let list = items[col]!;
    const oldIndex = list.findIndex((i) => i.id === itemId);
    const overIndex = list.findIndex((i) => i.id === over.id);
    if (overIndex >= 0 && overIndex !== oldIndex) {
      list = arrayMove(list, oldIndex, overIndex);
      setItems((prev) => ({ ...prev, [col]: list }));
    }

    const index = list.findIndex((i) => i.id === itemId);
    const originalIndex = snap.map[snap.from]!.findIndex((i) => i.id === itemId);
    if (col === snap.from && index === originalIndex) return; // tidak berpindah

    const ok = await onMove({
      itemId,
      fromColumnId: snap.from,
      toColumnId: col,
      beforeId: list[index - 1]?.id ?? null,
      afterId: list[index + 1]?.id ?? null,
    });
    if (!ok) setItems(snap.map);
  }

  const announcements: Announcements = {
    onDragStart: () => "Kartu diangkat. Gunakan panah untuk memindah, Spasi untuk menjatuhkan, Esc untuk batal.",
    onDragOver: ({ over }) => (over ? `Kartu berada di atas ${columnById(findContainer(over.id) ?? "")?.title ?? "kolom"}.` : undefined),
    onDragEnd: ({ over }) => (over ? `Kartu dipindah ke ${columnById(findContainer(over.id) ?? "")?.title ?? "kolom"}.` : "Batal."),
    onDragCancel: () => "Pemindahan dibatalkan.",
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        if (snapshot.current) setItems(snapshot.current.map);
        snapshot.current = null;
        setActiveId(null);
      }}
      accessibility={{ announcements }}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column key={col.id} column={col} items={items[col.id] ?? []} renderCard={renderCard} canDrag={canDrag} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>
        {activeItem && (
          <div className="rotate-2 rounded-md shadow-(--shadow-drag) motion-reduce:rotate-0">{renderCard(activeItem)}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column<T extends { id: string }>({
  column,
  items,
  renderCard,
  canDrag,
  onOpen,
}: {
  column: KanbanColumn<T>;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  canDrag?: (item: T) => boolean;
  onOpen?: (item: T) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  if (column.dropOnly) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface p-3 text-center text-[13px] font-medium text-muted-foreground transition-colors",
          isOver && "border-primary bg-primary/5 text-primary",
        )}
      >
        {column.icon}
        <span>{column.title}</span>
        <span className="text-xs font-normal">jatuhkan di sini</span>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "flex max-h-[calc(100vh-11rem)] w-72 shrink-0 flex-col rounded-lg bg-surface",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <header className={cn("rounded-t-lg px-3 pt-3 pb-2", column.warn && "bg-warning/10")}>
        <div className="flex items-center gap-1.5">
          {column.icon}
          <h3 className="text-[15px] font-semibold">{column.title}</h3>
          <span className="ml-auto text-xs text-muted-foreground tabular">{items.length}</span>
        </div>
        {column.header}
      </header>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {items.map((item) => (
            <SortableCard
              key={item.id}
              id={item.id}
              disabled={canDrag ? !canDrag(item) : false}
              onOpen={onOpen ? () => onOpen(item) : undefined}
            >
              {renderCard(item)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
      {column.footer && <div className="px-2 pb-2">{column.footer}</div>}
    </section>
  );
}

function SortableCard({
  id,
  disabled,
  onOpen,
  children,
}: {
  id: string;
  disabled: boolean;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isDragging && "opacity-40",
        !disabled && "cursor-grab active:cursor-grabbing",
      )}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && onOpen) onOpen();
      }}
    >
      {children}
    </div>
  );
}
