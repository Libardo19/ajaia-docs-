import { documentController } from "@/server/controllers/document.controller";
import { withAuth } from "@/server/middlewares/with-auth";
import { withErrors } from "@/server/middlewares/with-errors";

export const GET = withErrors(withAuth(documentController.list));
export const POST = withErrors(withAuth(documentController.create));
