import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Document not found</h1>
      <p className="max-w-sm text-sm text-gray-500">
        It may have been deleted, or it hasn&apos;t been shared with this account. Try switching
        accounts or ask the owner for access.
      </p>
      <Link href="/" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
        Back to documents
      </Link>
    </main>
  );
}
