import { requireUser } from "@/server/session";
import { db } from "@/server/db";
import { signOut } from "@/server/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Avatar } from "@/components/ui/misc";
import { LogOut } from "lucide-react";

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
    <div className="flex min-h-screen">
      <Sidebar boards={boards} isAdmin={user.role !== "MEMBER"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-border px-6">
          <div className="flex items-center gap-2">
            <Avatar name={user.name} size={32} />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-[13px] font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" aria-label="Keluar" title="Keluar" className="rounded-md p-2 hover:bg-surface">
              <LogOut className="size-4" />
            </button>
          </form>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
