import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/core";
import { documentService } from "../services/document.service";
import type { SessionUser } from "../services/session.service";
import { readJson, type Params } from "../middlewares/request";
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validation";
import { BadRequestError, PayloadTooLargeError } from "@/lib/errors";
import { MAX_IMPORT_BYTES } from "../lib/convert";

type IdParams = Params<{ id: string }>;

export const documentController = {
  async list(_req: Request, _ctx: unknown, user: SessionUser) {
    return NextResponse.json(await documentService.listForUser(user.id));
  },

  async create(req: Request, _ctx: unknown, user: SessionUser) {
    const input = createDocumentSchema.parse(await readJson(req));
    return NextResponse.json(await documentService.create(user.id, input), { status: 201 });
  },

  async get(_req: Request, { params }: IdParams, user: SessionUser) {
    const { id } = await params;
    return NextResponse.json(await documentService.getForUser(user.id, id));
  },

  /** Rename and/or save content. Requires `baseVersion` (optimistic concurrency). */
  async update(req: Request, { params }: IdParams, user: SessionUser) {
    const { id } = await params;
    const input = updateDocumentSchema.parse(await readJson(req));
    const result = await documentService.update(user.id, id, {
      ...input,
      content: input.content as JSONContent | undefined,
    });
    return NextResponse.json(result);
  },

  async remove(_req: Request, { params }: IdParams, user: SessionUser) {
    const { id } = await params;
    await documentService.remove(user.id, id);
    return new NextResponse(null, { status: 204 });
  },

  /** multipart/form-data with a `file` field (.txt / .md / .docx, max 2 MB). */
  async import(req: Request, _ctx: unknown, user: SessionUser) {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_IMPORT_BYTES + 64 * 1024) throw new PayloadTooLargeError("File is larger than 2 MB.");
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new BadRequestError("Expected a multipart/form-data upload.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new BadRequestError('Attach a file in the "file" field.');
    const doc = await documentService.importFile(user.id, file.name, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(doc, { status: 201 });
  },

  async exportMarkdown(_req: Request, { params }: IdParams, user: SessionUser) {
    const { id } = await params;
    const { markdown, filename } = await documentService.exportMarkdown(user.id, id);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
};
