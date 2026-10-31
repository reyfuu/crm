import { requireUser } from "@/server/session";
import { db } from "@/server/db";
import { can } from "@/server/permissions";
import { signOut } from "@/server/auth";
import { MobileNavigation, PageBreadcrumb, Sidebar } from "@/components/layout/sidebar";
import { Avatar } from "@/components/ui/misc";
import { LogOut, Search } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const boards = await db.board.findMany({
    where: {
      isArchived: false,
      OR: [{ visibility: "ALL" }, { members: { some: { userId: user.id } } }],
    },
    select: { id: true, name: true },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-dvh">
      <a href="#main-content" className="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0">Lewati ke konten</a>
      <Sidebar boards={boards} canManageUsers={can(user, "user.manage")} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[76px] flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
          <MobileNavigation boards={boards} canManageUsers={can(user, "user.manage")} />
          <PageBreadcrumb />
          <form action="/contacts" role="search" className="ml-auto flex h-10 min-w-0 max-w-64 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="workspace-search" className="sr-only">Cari kontak</label>
            <input id="workspace-search" name="q" type="search" placeholder="Cari kontak…" className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </form>
          <div className="ml-1 flex items-center gap-3 border-l border-border pl-4">
            <Avatar name={user.name} size={34} />
            <div className="hidden leading-tight xl:block">
              <p className="text-[13px] font-medium">{user.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{user.role === "MEMBER" ? "Anggota tim" : user.role === "MANAGER" ? "Manajer" : "Administrator"}</p>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" aria-label="Keluar" title="Keluar" className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground">
              <LogOut className="size-4" />
            </button>
          </form>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
