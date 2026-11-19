import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/core";
import { deleteDocument, getDocumentForUser, updateDocument } from "@/server/documents";
import { requireUser } from "@/server/session";
import { readJson, route } from "@/server/http";
import { updateDocumentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json(await getDocumentForUser(user.id, id));
});

/** Rename and/or save content. Requires `baseVersion` (optimistic concurrency). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = updateDocumentSchema.parse(await readJson(req));
  const result = await updateDocument(user.id, id, {
    ...input,
    content: input.content as JSONContent | undefined,
  });
  return NextResponse.json(result);
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteDocument(user.id, id);
  return new NextResponse(null, { status: 204 });
});
