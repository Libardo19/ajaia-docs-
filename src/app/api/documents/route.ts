import { NextResponse } from "next/server";
import { createDocument, listDocumentsForUser } from "@/server/documents";
import { requireUser } from "@/server/session";
import { readJson, route } from "@/server/http";
import { createDocumentSchema } from "@/lib/validation";

export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocumentsForUser(user.id));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = req.headers.get("content-length") === "0" ? {} : await readJson(req);
  const input = createDocumentSchema.parse(body ?? {});
  const doc = await createDocument(user.id, input);
  return NextResponse.json(doc, { status: 201 });
});
