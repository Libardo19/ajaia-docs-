import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/session";
import { route } from "@/server/http";

/** Directory used by the share dialog's autocomplete. */
export const GET = route(async () => {
  await requireUser();
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, color: true },
  });
  return NextResponse.json({ users });
});
