"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, CheckSquare, ChevronRight, Columns3, Layers2, LayoutDashboard, Menu, Plus, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Kontak", icon: Users },
  { href: "/companies", label: "Perusahaan", icon: Building2 },
  { href: "/deals", label: "Pipeline penjualan", icon: Columns3 },
  { href: "/my-tasks", label: "Tugas saya", icon: CheckSquare },
];

type SidebarProps = { boards: { id: string; name: string }[]; canManageUsers?: boolean };

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar">
        <Layers2 className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xl font-semibold tracking-tight">CRM<span className="text-sidebar-primary">.</span></span>
      {!compact && <span className="ml-auto rounded-md border border-sidebar-border px-2 py-1 text-[10px] font-medium tracking-widest text-sidebar-foreground">WORKSPACE</span>}
    </span>
  );
}

function SidebarContent({ boards, canManageUsers, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const item = (active: boolean) => cn(
    "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-sidebar-primary",
    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  );

  return (
    <div className="flex min-h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-accent-foreground">
      <Link href="/dashboard" onClick={onNavigate} aria-label="CRM — Dashboard" className="px-1 py-2"><Brand /></Link>
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
        <p className="text-[13px] font-medium">Ruang kerja tim</p>
        <p className="mt-1 text-xs text-sidebar-foreground">Relasi, peluang, dan kolaborasi.</p>
      </div>
      <div>
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground">MENU UTAMA</p>
        <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onNavigate} aria-current={isActive(href) ? "page" : undefined} className={item(isActive(href))}>
              <Icon className={cn("size-[18px] shrink-0", isActive(href) && "text-sidebar-primary")} aria-hidden="true" />
              {label}
              {isActive(href) && <ChevronRight className="ml-auto size-3.5 text-sidebar-primary" aria-hidden="true" />}
            </Link>
          ))}
        </nav>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between pl-3">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground">BOARD TIM</p>
          <Link href="/boards" onClick={onNavigate} className="flex size-11 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" aria-label="Kelola dan tambah board"><Plus className="size-4" /></Link>
        </div>
        <nav aria-label="Board tim" className="flex flex-col gap-1">
          {boards.map((b) => (
            <Link key={b.id} href={`/boards/${b.id}`} onClick={onNavigate} aria-current={isActive(`/boards/${b.id}`) ? "page" : undefined} className={item(isActive(`/boards/${b.id}`))}>
              <span className="size-2 shrink-0 rounded-[3px] border border-sidebar-primary/70" aria-hidden="true" />
              <span className="truncate">{b.name}</span>
            </Link>
          ))}
          <Link href="/boards" onClick={onNavigate} aria-current={pathname === "/boards" ? "page" : undefined} className={item(pathname === "/boards")}>
            <Columns3 className="size-4" aria-hidden="true" /> Semua board
          </Link>
        </nav>
      </div>
      <div className="mt-auto flex flex-col gap-4 pt-6">
        <Link href="/my-tasks" onClick={onNavigate} className="rounded-xl border border-sidebar-border p-4 transition-colors hover:bg-sidebar-accent">
          <div className="flex items-center justify-between text-sidebar-primary"><CheckSquare className="size-5" aria-hidden="true" /><ArrowUpRight className="size-4" aria-hidden="true" /></div>
          <p className="mt-3 text-sm font-medium">Satu langkah lebih dekat.</p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground">Lihat prioritas dan lanjutkan tugas Anda hari ini.</p>
        </Link>
        {canManageUsers && (
          <div className="flex flex-col gap-1">
            <Link href="/settings/users" onClick={onNavigate} aria-current={isActive("/settings/users") ? "page" : undefined} className={item(isActive("/settings/users"))}><UserCog className="size-[18px]" aria-hidden="true" /> Pengguna</Link>
          </div>
        )}
        <div className="border-t border-sidebar-border px-3 pt-4 text-[11px] text-sidebar-foreground">CRM <span className="mx-1 opacity-50">/</span> Ruang untuk bertumbuh</div>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto bg-sidebar lg:block"><SidebarContent {...props} /></aside>;
}

export function MobileNavigation(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Buka navigasi" aria-expanded={open} aria-haspopup="dialog" className="flex size-11 items-center justify-center rounded-md hover:bg-surface"><Menu className="size-5" /></button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Navigasi" variant="sheet" className="mr-auto ml-0 max-w-xs border-sidebar-border bg-sidebar text-sidebar-accent-foreground" headerClassName="border-sidebar-border bg-sidebar [&_button:hover]:bg-sidebar-accent" contentClassName="bg-sidebar p-0">
        <SidebarContent {...props} onNavigate={() => setOpen(false)} />
      </Dialog>
    </div>
  );
}

export function PageBreadcrumb() {
  const pathname = usePathname();
  const section = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label
    ?? (pathname.startsWith("/boards") ? "Board tim" : pathname.startsWith("/settings/users") ? "Pengguna" : "Pengaturan");
  return <div aria-label="Lokasi halaman" className="hidden items-center gap-2 text-[13px] sm:flex"><span className="text-muted-foreground">Workspace</span><ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" /><span className="font-medium">{section}</span></div>;
}
