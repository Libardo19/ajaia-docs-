"use client";

import Link from "next/link";
import { FileText, LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { Avatar } from "./Avatar";

type User = { name: string; email: string; color: string };

export function AppHeader({ user, children }: { user: User; children?: React.ReactNode }) {
  async function switchAccount() {
    await api("/api/session", { method: "DELETE" }).catch(() => undefined);
    window.location.assign("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="hidden sm:inline">Ajaia Docs</span>
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <div className="flex items-center gap-2">
          <Avatar name={user.name} color={user.color} size="sm" />
          <span className="hidden text-sm md:inline">{user.name}</span>
          <button
            onClick={switchAccount}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            title="Sign out / switch account"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        </div>
      </div>
    </header>
  );
}
