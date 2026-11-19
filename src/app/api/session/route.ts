import { sessionController } from "@/server/controllers/session.controller";
import { withErrors } from "@/server/middlewares/with-errors";

export const GET = withErrors(sessionController.me);
export const POST = withErrors(sessionController.signIn);
export const DELETE = withErrors(sessionController.signOut);
