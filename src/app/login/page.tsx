import { sessionService } from "@/server/services/session.service";
import { LoginPicker } from "@/components/LoginPicker";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const users = await sessionService.listDemoUsers();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold">Ajaia Docs</h1>
        </div>
        <h2 className="text-lg font-medium">Choose a demo account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Authentication is mocked for this prototype. Pick a user to sign in; switch accounts any
          time to test sharing.
        </p>
        <LoginPicker users={users} next={next?.startsWith("/") ? next : "/"} />
      </div>
    </main>
  );
}
