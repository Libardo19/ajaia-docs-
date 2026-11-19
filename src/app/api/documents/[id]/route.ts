import { documentController } from "@/server/controllers/document.controller";
import { withAuth } from "@/server/middlewares/with-auth";
import { withErrors } from "@/server/middlewares/with-errors";

export const GET = withErrors(withAuth(documentController.get));
export const PATCH = withErrors(withAuth(documentController.update));
export const DELETE = withErrors(withAuth(documentController.remove));
