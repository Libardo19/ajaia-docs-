"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Avatar } from "../Avatar";
import { EmailAutocomplete } from "./EmailAutocomplete";

type ShareRole = "VIEWER" | "EDITOR";
type Person = { id: string; name: string; email: string; color: string };
type Share = { role: ShareRole; user: Person };

export function ShareDialog({
  open,
  onClose,
  documentId,
  owner,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  documentId: string;
  owner: { id: string; name: string; email: string };
  canManage: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [directory, setDirectory] = useState<Person[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("EDITOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([
        api<{ shares: Share[] }>(`/api/documents/${documentId}/shares`),
        canManage ? api<{ users: Person[] }>("/api/users") : Promise.resolve({ users: [] }),
      ]);
      setShares(s.shares);
      setDirectory(u.users);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [documentId, canManage]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      void load();
    } else if (!open && d.open) d.close();
  }, [open, load]);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const share = await api<Share>(`/api/documents/${documentId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setShares((prev) => [...(prev ?? []).filter((s) => s.user.id !== share.user.id), share]);
      setEmail("");
      toast.success(`${share.user.name} can now ${share.role === "EDITOR" ? "edit" : "view"}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, email: string, newRole: ShareRole) {
    try {
      const share = await api<Share>(`/api/documents/${documentId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email, role: newRole }),
      });
      setShares((prev) => (prev ?? []).map((s) => (s.user.id === userId ? share : s)));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function revoke(userId: string) {
    try {
      await api(`/api/documents/${documentId}/shares/${userId}`, { method: "DELETE" });
      setShares((prev) => (prev ?? []).filter((s) => s.user.id !== userId));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const sharedIds = new Set([owner.id, ...(shares ?? []).map((s) => s.user.id)]);
  const suggestions = directory.filter((p) => !sharedIds.has(p.id));

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-visible rounded-2xl p-0 shadow-xl backdrop:bg-black/30"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share document</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {canManage ? (
          <form onSubmit={grant} className="flex flex-col gap-2 sm:flex-row">
            <EmailAutocomplete value={email} onChange={setEmail} suggestions={suggestions} />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ShareRole)}
              aria-label="Role"
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="EDITOR">Can edit</option>
              <option value="VIEWER">Can view</option>
            </select>
            <button
              disabled={busy || !email}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Sharing…" : "Share"}
            </button>
          </form>
        ) : (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Only the owner ({owner.name}) can change who has access.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <h3 className="mt-6 mb-2 text-sm font-medium text-gray-500">People with access</h3>
        <ul className="space-y-2">
          <li className="flex items-center gap-3">
            <Avatar name={owner.name} color="#2563eb" size="sm" />
            <span className="flex-1 text-sm">
              {owner.name} <span className="text-gray-500">· {owner.email}</span>
            </span>
            <span className="text-sm text-gray-500">Owner</span>
          </li>
          {shares === null && <li className="text-sm text-gray-400">Loading…</li>}
          {shares?.map((s) => (
            <li key={s.user.id} className="flex items-center gap-3">
              <Avatar name={s.user.name} color={s.user.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {s.user.name} <span className="text-gray-500">· {s.user.email}</span>
              </span>
              {canManage ? (
                <>
                  <select
                    value={s.role}
                    onChange={(e) => changeRole(s.user.id, s.user.email, e.target.value as ShareRole)}
                    aria-label={`Role for ${s.user.name}`}
                    className="rounded-md border border-gray-200 px-1 py-1 text-sm"
                  >
                    <option value="EDITOR">Can edit</option>
                    <option value="VIEWER">Can view</option>
                  </select>
                  <button
                    onClick={() => revoke(s.user.id)}
                    className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-500">{s.role === "EDITOR" ? "Can edit" : "Can view"}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
