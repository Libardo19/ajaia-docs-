import { PrismaClient, type Prisma } from "@prisma/client";
import { htmlToDoc } from "../src/server/convert";

const prisma = new PrismaClient();

const USERS = [
  { email: "alice@ajaia.test", name: "Alice Admin", color: "#2563eb" },
  { email: "bob@ajaia.test", name: "Bob Builder", color: "#16a34a" },
  { email: "carol@ajaia.test", name: "Carol Critic", color: "#db2777" },
];

const welcomeHtml = `
<h1>Welcome to Ajaia Docs</h1>
<p>This document is owned by <strong>Alice</strong> and shared with <strong>Bob</strong> as an <em>editor</em>
and with <strong>Carol</strong> as a <u>viewer</u>.</p>
<h2>Try this</h2>
<ol>
  <li>Edit this text as Alice or Bob — it autosaves.</li>
  <li>Switch to Carol: the document is read-only.</li>
  <li>Open it as Alice and Bob in two windows and edit both to see conflict protection.</li>
</ol>
<ul><li>Bold, italic, underline</li><li>Headings H1–H3</li><li>Bulleted and numbered lists</li></ul>`;

async function main() {
  const users = await Promise.all(
    USERS.map((u) => prisma.user.upsert({ where: { email: u.email }, update: u, create: u })),
  );
  const [alice, bob, carol] = users;

  // Idempotent: only seed demo documents once.
  if ((await prisma.document.count()) > 0) {
    console.log("Users upserted; documents already exist, skipping demo docs.");
    return;
  }

  const welcome = await prisma.document.create({
    data: {
      title: "Welcome to Ajaia Docs",
      content: htmlToDoc(welcomeHtml) as Prisma.InputJsonValue,
      ownerId: alice.id,
      updatedById: alice.id,
      shares: { create: [{ userId: bob.id, role: "EDITOR" }, { userId: carol.id, role: "VIEWER" }] },
    },
  });

  await prisma.document.create({
    data: {
      title: "Carol's review notes",
      content: htmlToDoc(
        "<h2>Review notes</h2><p>Shared with Alice as <strong>viewer</strong> only.</p>",
      ) as Prisma.InputJsonValue,
      ownerId: carol.id,
      updatedById: carol.id,
      shares: { create: [{ userId: alice.id, role: "VIEWER" }] },
    },
  });

  console.log(`Seeded ${users.length} users and demo documents (welcome: ${welcome.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
