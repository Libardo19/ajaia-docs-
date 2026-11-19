"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/core";
import { AlertTriangle, Check, CloudOff, Download, Eye, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { editorExtensions } from "@/lib/editor-extensions";
import { can, type Role } from "@/lib/access";
import { AppHeader } from "../AppHeader";
import { RoleBadge } from "../RoleBadge";
import { Toolbar } from "./Toolbar";
import { ShareDialog } from "./ShareDialog";
import { useAutosave, type SaveStatus } from "./useAutosave";

type Props = {
  user: { id: string; name: string; email: string; color: string };
  doc: {
    id: string;
    title: string;
    content: JSONContent;
    version: number;
    updatedAt: string;
    updatedByName: string | null;
    owner: { id: string; name: string; email: string };
    role: Role;
  };
};

export function DocEditor({ user, doc }: Props) {
  const editable = can(doc.role, "edit");
  const [title, setTitle] = useState(doc.title);
  const [shareOpen, setShareOpen] = useState(false);
  const titleRef = useRef(doc.title);
  const contentRef = useRef<JSONContent>(doc.content);

  const getSnapshot = useCallback(
    () => ({ title: titleRef.current, content: contentRef.current }),
    [],
  );
  const autosave = useAutosave({
    documentId: doc.id,
    initialVersion: doc.version,
    getSnapshot,
    enabled: editable,
  });
  const { markDirty, save } = autosave;

  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({ placeholder: editable ? "Start writing…" : "" }),
    ],
    content: doc.content,
    editable,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": "Document body", spellcheck: "true" } },
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getJSON();
      markDirty();
    },
  });

  // Ctrl/Cmd+S saves immediately instead of opening the browser's "Save page" dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (editable) save().catch((err) => toast.error((err as Error).message));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, save]);

  function onTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    if (value.trim()) markDirty();
  }

  function onTitleBlur() {
    if (!title.trim()) {
      // Empty titles aren't allowed; fall back to the last saved one.
      const fallback = doc.title || "Untitled document";
      setTitle(fallback);
      titleRef.current = fallback;
    }
  }

  function reloadLatest() {
    autosave.reset();
    window.location.reload();
  }

  async function deleteDoc() {
    if (!window.confirm(`Delete "${title}"? This can't be undone and removes access for everyone.`)) return;
    try {
      autosave.reset();
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      toast.success("Document deleted.");
      window.location.assign("/");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function keepMine() {
    save(true)
      .then(() => toast.success("Your version was saved."))
      .catch((e) => toast.error((e as Error).message));
  }

  return (
    <>
      <AppHeader user={user}>
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={onTitleBlur}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            readOnly={!editable}
            maxLength={200}
            aria-label="Document title"
            className="min-w-0 flex-1 truncate rounded-md border border-transparent px-2 py-1 text-base font-medium hover:border-gray-200 focus:border-blue-400 focus:outline-none read-only:hover:border-transparent"
          />
          <RoleBadge role={doc.role} />
          {editable && <SaveIndicator status={autosave.status} onRetry={() => save().catch(() => undefined)} />}
        </div>
      </AppHeader>

      <div className="mx-auto max-w-4xl px-4 pb-24">
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 bg-[#f6f7f9] py-3">
          {editable && editor ? (
            <Toolbar editor={editor} />
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
              <Eye className="h-4 w-4" /> <span>View only — {doc.owner.name} shared this with you</span>
            </span>
          )}
          <div className="ml-auto flex gap-2">
            {can(doc.role, "delete") && (
              <button
                onClick={deleteDoc}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"
                title="Delete document"
                aria-label="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <a
              href={`/api/documents/${doc.id}/export`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
              title="Download as Markdown"
            >
              <Download className="h-4 w-4" /> <span>Export .md</span>
            </a>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Share2 className="h-4 w-4" /> <span>Share</span>
            </button>
          </div>
        </div>

        {autosave.status === "conflict" && (
          <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              <strong>{autosave.conflictBy}</strong> saved changes while you were editing. Autosave is
              paused so nothing gets overwritten.
            </span>
            <button onClick={reloadLatest} className="rounded-md bg-white px-3 py-1 font-medium ring-1 ring-amber-300 hover:bg-amber-100">
              Load their version
            </button>
            <button onClick={keepMine} className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700">
              Keep mine
            </button>
          </div>
        )}

        <article className="doc-content rounded-xl border border-gray-200 bg-white px-6 py-10 shadow-sm sm:px-16">
          {editor ? <EditorContent editor={editor} /> : <div className="min-h-[60vh] animate-pulse" />}
        </article>
        <p className="mt-3 text-center text-xs text-gray-500">
          Owner: {doc.owner.name}
          {doc.updatedByName && ` · Last edited by ${doc.updatedByName}`}
        </p>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={doc.id}
        owner={doc.owner}
        canManage={can(doc.role, "share")}
      />
    </>
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const base = "hidden items-center gap-1 whitespace-nowrap text-xs sm:inline-flex";
  switch (status) {
    case "saving":
      return <span className={`${base} text-gray-500`}><Loader2 className="h-3.5 w-3.5 animate-spin" /> <span>Saving…</span></span>;
    case "dirty":
      return <span className={`${base} text-gray-500`}><span>Unsaved changes</span></span>;
    case "error":
      return (
        <button onClick={onRetry} className={`${base} text-red-600 hover:underline`}>
          <CloudOff className="h-3.5 w-3.5" /> <span>Save failed — retry</span>
        </button>
      );
    case "conflict":
      return <span className={`${base} text-amber-700`}><AlertTriangle className="h-3.5 w-3.5" /> <span>Conflict</span></span>;
    default:
      return <span className={`${base} text-green-700`}><Check className="h-3.5 w-3.5" /> <span>Saved</span></span>;
  }
}
