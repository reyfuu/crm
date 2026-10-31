import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, PageHeader } from "@/components/ui/misc";
import { CreateBoardForm } from "./create-board-form";
import { ArrowUpRight, Columns3 } from "lucide-react";

export const metadata: Metadata = { title: "Board" };

export default async function BoardsPage() {
  const user = await requireUser();
  const boards = await db.board.findMany({
    where: { isArchived: false, OR: [{ visibility: "ALL" }, { members: { some: { userId: user.id } } }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { members: true } }, columns: { select: { _count: { select: { tasks: true } } } } },
  });

  return (
    <>
      <PageHeader title="Board Tugas"><p className="mt-2 text-sm text-muted-foreground">Satu ruang untuk setiap proyek. Kolaborasi jadi lebih terarah.</p></PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {boards.map((b) => (
            <Link key={b.id} href={`/boards/${b.id}`}>
              <Card className="h-full p-5 transition-colors hover:border-primary/40">
                <div className="mb-5 flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Columns3 className="size-5" aria-hidden="true" /></span><ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" /></div>
                <p className="font-semibold">{b.name}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {b.columns.reduce((s, c) => s + c._count.tasks, 0)} tugas · {b._count.members} anggota
                  {b.isSystem && " · board sistem"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
        <Card className="h-fit p-4">
          <h2 className="mb-3 text-lg font-semibold">Buat board baru</h2>
          <CreateBoardForm />
        </Card>
      </div>
    </>
  );
}
