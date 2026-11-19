import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { getDocumentForUser } from "@/server/documents";
import { AppError } from "@/lib/errors";
import { DocEditor } from "@/components/editor/DocEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/docs/${id}`);

  let doc;
  try {
    doc = await getDocumentForUser(user.id, id);
  } catch (e) {
    // No access and "doesn't exist" look the same on purpose.
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  return <DocEditor user={user} doc={{ ...doc, updatedAt: doc.updatedAt.toISOString() }} />;
}
