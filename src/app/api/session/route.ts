import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { createSession, destroySession, getCurrentUser } from "@/server/session";
import { readJson, route } from "@/server/http";
import { loginSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

export const GET = route(async () => {
  return NextResponse.json({ user: await getCurrentUser() });
});

/** Mock login: sign in as one of the seeded users. */
export const POST = route(async (req) => {
  const { userId } = loginSchema.parse(await readJson(req));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Unknown user.");
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
});

export const DELETE = route(async () => {
  await destroySession();
  return new NextResponse(null, { status: 204 });
});
