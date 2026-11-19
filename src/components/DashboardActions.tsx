"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

const ACCEPT = ".txt,.md,.markdown,.docx";
const MAX_BYTES = 2 * 1024 * 1024;

export function DashboardActions() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "import" | null>(null);

  async function createDoc() {
    setBusy("new");
    try {
      const doc = await api<{ id: string }>("/api/documents", { method: "POST", body: "{}" });
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    // Client-side checks give instant feedback; the server re-validates everything.
    if (!/\.(txt|md|markdown|docx)$/i.test(file.name)) {
      toast.error("Unsupported file type. Use .txt, .md or .docx.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is larger than 2 MB.");
      return;
    }
    setBusy("import");
    try {
      const form = new FormData();
      form.append("file", file);
      const doc = await api<{ id: string; title: string }>("/api/import", { method: "POST", body: form });
      toast.success(`Imported "${doc.title}"`);
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => input.current?.click()}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {busy === "import" ? "Importing…" : "Import file"}
        </button>
        <button
          onClick={createDoc}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {busy === "new" ? "Creating…" : "New document"}
        </button>
      </div>
      <p className="text-xs text-gray-500">Import supports .txt, .md and .docx (max 2 MB)</p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void importFile(f);
        }}
      />
    </div>
  );
}
