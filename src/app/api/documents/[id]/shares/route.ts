import { shareController } from "@/server/controllers/share.controller";
import { withAuth } from "@/server/middlewares/with-auth";
import { withErrors } from "@/server/middlewares/with-errors";

export const GET = withErrors(withAuth(shareController.list));
export const POST = withErrors(withAuth(shareController.grant));
