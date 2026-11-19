import { NextResponse } from "next/server";
import { shareService } from "../services/share.service";
import type { SessionUser } from "../services/session.service";
import { readJson, type Params } from "../middlewares/request";
import { shareSchema } from "@/lib/validation";

export const shareController = {
  async list(_req: Request, { params }: Params<{ id: string }>, user: SessionUser) {
    const { id } = await params;
    return NextResponse.json({ shares: await shareService.list(user.id, id) });
  },

  async grant(req: Request, { params }: Params<{ id: string }>, user: SessionUser) {
    const { id } = await params;
    const input = shareSchema.parse(await readJson(req));
    return NextResponse.json(await shareService.grant(user.id, id, input), { status: 201 });
  },

  async revoke(_req: Request, { params }: Params<{ id: string; userId: string }>, user: SessionUser) {
    const { id, userId } = await params;
    await shareService.revoke(user.id, id, userId);
    return new NextResponse(null, { status: 204 });
  },
};
