import { NextResponse } from "next/server";
import { listShares, upsertShare } from "@/server/documents";
import { requireUser } from "@/server/session";
import { readJson, route } from "@/server/http";
import { shareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ shares: await listShares(user.id, id) });
});

/** Grant (or change) access for a user by email. Owner only. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = shareSchema.parse(await readJson(req));
  return NextResponse.json(await upsertShare(user.id, id, input), { status: 201 });
});
