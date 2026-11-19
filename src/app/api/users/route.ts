import { sessionController } from "@/server/controllers/session.controller";
import { withAuth } from "@/server/middlewares/with-auth";
import { withErrors } from "@/server/middlewares/with-errors";

/** Directory used by the share dialog's autocomplete. */
export const GET = withErrors(withAuth(sessionController.listUsers));
