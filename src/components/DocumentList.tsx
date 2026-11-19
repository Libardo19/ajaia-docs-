import Link from "next/link";
import { FileText } from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import type { Role } from "@/lib/access";
import { RelativeTime } from "./RelativeTime";

type Item = { id: string; title: string; updatedAt: string; role: Role; meta: string };

export function DocumentList({ title, empty, docs }: { title: string; empty: string; docs: Item[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title} <span className="font-normal">({docs.length})</span>
      </h2>
      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {docs.map((d) => (
            <li key={d.id}>
              <Link
                href={`/docs/${d.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
              >
                <FileText className="h-5 w-5 shrink-0 text-blue-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{d.title}</span>
                  <span className="block truncate text-xs text-gray-500">{d.meta}</span>
                </span>
                <RoleBadge role={d.role} />
                <span className="hidden w-28 text-right text-xs text-gray-500 sm:block">
                  <RelativeTime iso={d.updatedAt} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
