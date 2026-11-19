import { shareController } from "@/server/controllers/share.controller";
import { withAuth } from "@/server/middlewares/with-auth";
import { withErrors } from "@/server/middlewares/with-errors";

export const DELETE = withErrors(withAuth(shareController.revoke));
