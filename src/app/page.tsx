import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { listDocumentsForUser } from "@/server/documents";
import { AppHeader } from "@/components/AppHeader";
import { DashboardActions } from "@/components/DashboardActions";
import { DocumentList } from "@/components/DocumentList";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocumentsForUser(user.id);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-gray-500">Signed in as {user.email}</p>
          </div>
          <DashboardActions />
        </div>

        <DocumentList
          title="My documents"
          empty="You don't own any documents yet. Create one or import a file."
          docs={owned.map((d) => ({
            ...d,
            updatedAt: d.updatedAt.toISOString(),
            meta: d.shareCount > 0 ? `Shared with ${d.shareCount}` : "Private",
          }))}
        />
        <DocumentList
          title="Shared with me"
          empty="Nothing has been shared with you yet."
          docs={shared.map((d) => ({
            ...d,
            updatedAt: d.updatedAt.toISOString(),
            meta: `Owner: ${d.owner.name}`,
          }))}
        />
      </main>
    </>
  );
}
