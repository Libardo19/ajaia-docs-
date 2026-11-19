import type { Role } from "@/lib/access";

const STYLES: Record<Role, string> = {
  owner: "bg-blue-50 text-blue-700 ring-blue-200",
  editor: "bg-green-50 text-green-700 ring-green-200",
  viewer: "bg-gray-100 text-gray-700 ring-gray-200",
};
const LABELS: Record<Role, string> = { owner: "Owner", editor: "Can edit", viewer: "View only" };

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STYLES[role]}`}>
      {LABELS[role]}
    </span>
  );
}
