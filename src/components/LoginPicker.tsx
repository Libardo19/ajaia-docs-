"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Avatar } from "./Avatar";

type User = { id: string; name: string; email: string; color: string };

export function LoginPicker({ users, next }: { users: User[]; next: string }) {
  const [pending, setPending] = useState<string | null>(null);

  async function signIn(email: string) {
    setPending(email);
    try {
      await api("/api/session", { method: "POST", body: JSON.stringify({ email }) });
      // Full navigation so every server component re-renders with the new session.
      window.location.assign(next);
    } catch (e) {
      toast.error((e as Error).message);
      setPending(null);
    }
  }

  if (users.length === 0) {
    return (
      <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        No users found. Run <code>npm run db:seed</code>.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-2">
      {users.map((u) => (
        <li key={u.id}>
          <button
            onClick={() => signIn(u.email)}
            disabled={pending !== null}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60"
          >
            <Avatar name={u.name} color={u.color} />
            <span className="flex-1">
              <span className="block font-medium">{u.name}</span>
              <span className="block text-sm text-gray-500">{u.email}</span>
            </span>
            {pending === u.email && <span className="text-sm text-gray-500">Signing in…</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
