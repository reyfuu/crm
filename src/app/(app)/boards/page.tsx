import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, PageHeader } from "@/components/ui/misc";
import { CreateBoardForm } from "./create-board-form";

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
      <PageHeader title="Board Tugas" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {boards.map((b) => (
            <Link key={b.id} href={`/boards/${b.id}`}>
              <Card className="p-4 transition-shadow hover:shadow-(--shadow-card-hover)">
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
