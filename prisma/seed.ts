import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  }),
});

const DEFAULT_PASSWORD = "password123";

async function main() {
  const existing = await db.user.count();
  if (existing > 0) {
    console.log("Database sudah berisi data, seed dilewati.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const [admin, manager, budi, sari] = await Promise.all([
    db.user.create({ data: { name: "Admin CRM", email: "admin@crm.local", role: "ADMIN", passwordHash } }),
    db.user.create({ data: { name: "Rina Manager", email: "rina@crm.local", role: "MANAGER", passwordHash } }),
    db.user.create({ data: { name: "Budi Santoso", email: "budi@crm.local", role: "MEMBER", passwordHash } }),
    db.user.create({ data: { name: "Sari Ops", email: "sari@crm.local", role: "MEMBER", passwordHash } }),
  ]);

  // Tahap pipeline (satu pipeline saja)
  const stageDefs = [
    { name: "Lead", probability: 10 },
    { name: "Qualified", probability: 25 },
    { name: "Proposal", probability: 50, rottingDays: 10 },
    { name: "Negotiation", probability: 75, rottingDays: 7 },
    { name: "Won", probability: 100, type: "WON" as const },
    { name: "Lost", probability: 0, type: "LOST" as const },
  ];
  const stages = [];
  for (const [i, s] of stageDefs.entries()) {
    stages.push(await db.stage.create({ data: { ...s, position: (i + 1) * 1024 } }));
  }

  await db.lostReason.createMany({
    data: ["Harga", "Kompetitor", "Tidak ada budget", "Tidak responsif", "Timing"].map((name, i) => ({
      name,
      position: (i + 1) * 1024,
    })),
  });
  await db.leadSource.createMany({
    data: ["Website", "Referral", "Iklan", "Event", "WhatsApp", "Lainnya"].map((name, i) => ({
      name,
      position: (i + 1) * 1024,
    })),
  });

  // Contoh perusahaan, kontak, deal
  const maju = await db.company.create({
    data: { name: "PT Maju Jaya", industry: "Distribusi", city: "Jakarta", ownerId: budi.id },
  });
  const sinar = await db.company.create({
    data: { name: "CV Sinar Abadi", industry: "Manufaktur", city: "Surabaya", ownerId: budi.id },
  });
  const andi = await db.contact.create({
    data: {
      firstName: "Andi",
      lastName: "Saputra",
      email: "andi@majujaya.co.id",
      phone: "+6281234567890",
      jobTitle: "Purchasing Manager",
      status: "PROSPECT",
      source: "Referral",
      companyId: maju.id,
      ownerId: budi.id,
    },
  });
  const dewi = await db.contact.create({
    data: {
      firstName: "Dewi",
      lastName: "Lestari",
      email: "dewi@sinarabadi.com",
      phone: "+6285711112222",
      jobTitle: "Owner",
      status: "LEAD",
      source: "Website",
      companyId: sinar.id,
      ownerId: manager.id,
    },
  });

  const dealDefs = [
    { title: "Pengadaan Laptop Q4", value: 125_000_000, stage: 2, contact: andi, company: maju, owner: budi, priority: "HIGH" as const },
    { title: "Lisensi Software Tahunan", value: 48_000_000, stage: 0, contact: dewi, company: sinar, owner: manager, priority: "MEDIUM" as const },
    { title: "Maintenance Server", value: 30_000_000, stage: 1, contact: andi, company: maju, owner: budi, priority: "LOW" as const },
    { title: "Upgrade Jaringan Kantor", value: 210_000_000, stage: 3, contact: dewi, company: sinar, owner: manager, priority: "URGENT" as const },
  ];
  for (const [i, d] of dealDefs.entries()) {
    const deal = await db.deal.create({
      data: {
        title: d.title,
        value: d.value,
        priority: d.priority,
        stageId: stages[d.stage]!.id,
        position: (i + 1) * 1024,
        contactId: d.contact.id,
        companyId: d.company.id,
        ownerId: d.owner.id,
        expectedCloseDate: new Date(Date.now() + (i + 1) * 7 * 864e5),
      },
    });
    await db.activity.create({
      data: { type: "SYSTEM", body: "Deal dibuat", dealId: deal.id, contactId: d.contact.id, companyId: d.company.id },
    });
  }

  // Board sistem "Follow-up Sales" + board contoh
  const followUp = await db.board.create({
    data: {
      name: "Follow-up Sales",
      isSystem: true,
      ownerId: admin.id,
      color: "indigo",
      columns: {
        create: [
          { name: "To Do", position: 1024 },
          { name: "In Progress", position: 2048 },
          { name: "Done", position: 3072, isDone: true },
        ],
      },
      members: { create: [admin, manager, budi, sari].map((u) => ({ userId: u.id })) },
    },
    include: { columns: { orderBy: { position: "asc" } } },
  });
  await db.board.create({
    data: {
      name: "Marketing Q4",
      ownerId: manager.id,
      color: "pink",
      columns: {
        create: [
          { name: "To Do", position: 1024 },
          { name: "In Progress", position: 2048, wipLimit: 3 },
          { name: "Review", position: 3072 },
          { name: "Done", position: 4096, isDone: true },
        ],
      },
      members: { create: [manager, sari].map((u) => ({ userId: u.id })) },
    },
  });

  const [todo, doing] = followUp.columns;
  const taskDefs = [
    { title: "Telepon Andi soal penawaran laptop", col: todo!, user: budi, due: 0, contact: andi },
    { title: "Kirim proposal ke CV Sinar Abadi", col: todo!, user: manager, due: 2, contact: dewi },
    { title: "Siapkan demo software", col: doing!, user: budi, due: -1, contact: null },
  ];
  for (const [i, t] of taskDefs.entries()) {
    await db.task.create({
      data: {
        title: t.title,
        columnId: t.col.id,
        position: (i + 1) * 1024,
        priority: i === 2 ? "HIGH" : "MEDIUM",
        dueDate: new Date(Date.now() + t.due * 864e5),
        createdById: manager.id,
        contactId: t.contact?.id,
        assignees: { create: { userId: t.user.id } },
      },
    });
  }

  console.log("Seed selesai. Login: admin@crm.local / " + DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
