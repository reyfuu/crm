"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CheckSquare, Columns3, LayoutDashboard, Plus, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Kontak", icon: Users },
  { href: "/companies", label: "Perusahaan", icon: Building2 },
  { href: "/deals", label: "Pipeline", icon: Columns3 },
  { href: "/my-tasks", label: "Tugas Saya", icon: CheckSquare },
];

export function Sidebar({ boards, isAdmin }: { boards: { id: string; name: string }[]; isAdmin: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const item = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground",
    );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-3 md:flex">
      <Link href="/dashboard" className="mb-4 px-2.5 py-2 text-base font-semibold text-primary">
        ◆ CRM
      </Link>
      <nav className="space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={item(isActive(href))}>
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </nav>

      <p className="mt-6 mb-1 px-2.5 text-xs font-medium text-muted-foreground uppercase">Board</p>
      <nav className="space-y-0.5">
        {boards.map((b) => (
          <Link key={b.id} href={`/boards/${b.id}`} className={item(isActive(`/boards/${b.id}`))}>
            <span className="size-1.5 rounded-full bg-current" /> <span className="truncate">{b.name}</span>
          </Link>
        ))}
        <Link href="/boards" className={item(pathname === "/boards")}>
          <Plus className="size-4" /> Board baru
        </Link>
      </nav>

      {isAdmin && (
        <Link href="/settings" className={cn(item(isActive("/settings")), "mt-auto")}>
          <Settings className="size-4" /> Pengaturan
        </Link>
      )}
    </aside>
  );
}
