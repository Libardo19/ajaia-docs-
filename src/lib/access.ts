import { ForbiddenError, NotFoundError } from "./errors";

export type Role = "owner" | "editor" | "viewer";
export type Action = "read" | "edit" | "export" | "share" | "delete";

const ALLOWED: Record<Action, readonly Role[]> = {
  read: ["owner", "editor", "viewer"],
  export: ["owner", "editor", "viewer"],
  edit: ["owner", "editor"],
  share: ["owner"],
  delete: ["owner"],
};

export interface AccessSubject {
  ownerId: string;
  shares: { userId: string; role: "VIEWER" | "EDITOR" }[];
}

/** Single source of truth for "what is this user to this document?" */
export function resolveRole(doc: AccessSubject, userId: string): Role | null {
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) return null;
  return share.role === "EDITOR" ? "editor" : "viewer";
}

export function can(role: Role | null, action: Action): boolean {
  return role !== null && ALLOWED[action].includes(role);
}

/**
 * Throws when the action is not allowed. Users with no access at all get 404
 * (not 403) so document ids can't be probed for existence.
 */
export function assertCan(role: Role | null, action: Action): asserts role is Role {
  if (role === null) throw new NotFoundError("Document not found.");
  if (!can(role, action)) {
    throw new ForbiddenError(
      action === "edit"
        ? "You have view-only access to this document."
        : "Only the owner can do that.",
    );
  }
}
