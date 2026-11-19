import { NextResponse } from "next/server";
import { sessionService } from "../services/session.service";
import { readJson } from "../middlewares/request";
import { loginSchema } from "@/lib/validation";

/** Controllers: HTTP in/out only — parse & validate the request, call a service, shape the response. */
export const sessionController = {
  async me() {
    return NextResponse.json({ user: await sessionService.currentUser() });
  },

  async signIn(req: Request) {
    const { email } = loginSchema.parse(await readJson(req));
    const user = await sessionService.signIn(email);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  },

  async signOut() {
    await sessionService.signOut();
    return new NextResponse(null, { status: 204 });
  },

  async listUsers() {
    return NextResponse.json({ users: await sessionService.listDemoUsers() });
  },
};
