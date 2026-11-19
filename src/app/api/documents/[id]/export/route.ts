import { getDocumentForUser } from "@/server/documents";
import { docToMarkdown } from "@/server/convert";
import { requireUser } from "@/server/session";
import { route } from "@/server/http";
import { assertCan } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const doc = await getDocumentForUser(user.id, id);
  assertCan(doc.role, "export");
  const markdown = docToMarkdown(doc.content, doc.title);
  const safeName = doc.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.md"`,
      "Cache-Control": "no-store",
    },
  });
});
