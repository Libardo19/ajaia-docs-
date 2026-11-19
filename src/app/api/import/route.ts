import { NextResponse } from "next/server";
import { createDocument } from "@/server/documents";
import { fileToDocument, MAX_IMPORT_BYTES } from "@/server/convert";
import { requireUser } from "@/server/session";
import { route } from "@/server/http";
import { BadRequestError, PayloadTooLargeError } from "@/lib/errors";

export const runtime = "nodejs";

/** Upload a .txt / .md / .docx file and turn it into a new editable document owned by the caller. */
export const POST = route(async (req) => {
  const user = await requireUser();
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

  const { title, content } = await fileToDocument(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(user.id, { title, content });
  return NextResponse.json(doc, { status: 201 });
});
