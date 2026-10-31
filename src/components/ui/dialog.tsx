"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Dialog ringan berbasis elemen <dialog> bawaan browser (fokus & Esc sudah ditangani).
// variant="sheet" = drawer dari kanan (detail deal), "modal" = di tengah.
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  variant = "modal",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "modal" | "sheet";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "border border-border bg-card p-0 text-foreground shadow-[0_20px_40px_rgba(16,24,40,.2)] backdrop:bg-black/40",
        variant === "modal" && "m-auto w-full max-w-md rounded-lg",
        variant === "sheet" && "my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-[520px] rounded-none sm:rounded-l-lg",
        className,
      )}
    >
      {open && (
        <div className={cn("p-5", variant === "sheet" && "flex h-full flex-col p-0")}>
          <div
            className={cn(
              "mb-4 flex items-start justify-between gap-3",
              variant === "sheet" && "sticky top-0 z-10 mb-0 border-b border-border bg-card px-5 py-4",
            )}
          >
            <div className="min-w-0 text-lg font-semibold">{title}</div>
            <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-sm p-1 hover:bg-surface">
              <X className="size-4" />
            </button>
          </div>
          <div className={cn(variant === "sheet" && "flex-1 overflow-y-auto px-5 py-4")}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
