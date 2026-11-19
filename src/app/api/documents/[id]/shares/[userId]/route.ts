import { NextResponse } from "next/server";
import { removeShare } from "@/server/documents";
import { requireUser } from "@/server/session";
import { route } from "@/server/http";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, userId } = await params;
  await removeShare(user.id, id, userId);
  return new NextResponse(null, { status: 204 });
});
