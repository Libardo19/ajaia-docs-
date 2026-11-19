import { sessionService, type SessionUser } from "../services/session.service";
import type { Handler } from "./with-errors";

export type AuthedHandler<C> = (req: Request, ctx: C, user: SessionUser) => Promise<Response>;

/** Requires a valid session cookie (401 otherwise) and hands the user to the controller. */
export function withAuth<C>(handler: AuthedHandler<C>): Handler<C> {
  return async (req, ctx) => handler(req, ctx, await sessionService.requireUser());
}
