import "server-only";
import type { Prisma } from "@prisma/client";
import type { JSONContent } from "@tiptap/core";
import { documentRepository } from "../repositories/document.repository";
import { shareRepository } from "../repositories/share.repository";
import { userRepository } from "../repositories/user.repository";
import { docToMarkdown, fileToDocument } from "../lib/convert";
import { assertCan, resolveRole, type Action, type Role } from "@/lib/access";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { EMPTY_DOC } from "@/lib/editor-extensions";

/** Loads a document and checks that `userId` may perform `action` on it. */
export async function authorize(userId: string, documentId: string, action: Action) {
  const doc = await documentRepository.findWithAccess(documentId);
  if (!doc) throw new NotFoundError("Document not found.");
  const role = resolveRole(doc, userId);
  assertCan(role, action);
  return { doc, role: role as Role };
}

export const documentService = {
  async listForUser(userId: string) {
    const [owned, shared] = await Promise.all([
      documentRepository.listOwnedBy(userId),
      shareRepository.listSharedWith(userId),
    ]);
    return {
      owned: owned.map(({ _count, ...d }) => ({ ...d, role: "owner" as Role, shareCount: _count.shares })),
      shared: shared.map((s) => ({
        ...s.document,
        role: (s.role === "EDITOR" ? "editor" : "viewer") as Role,
      })),
    };
  },

  create(userId: string, input: { title?: string; content?: JSONContent }) {
    return documentRepository.create({
      title: input.title ?? "Untitled document",
      content: (input.content ?? EMPTY_DOC) as Prisma.InputJsonValue,
      ownerId: userId,
    });
  },

  async getForUser(userId: string, documentId: string) {
    const { doc, role } = await authorize(userId, documentId, "read");
    const updatedBy = doc.updatedById ? await userRepository.findNameById(doc.updatedById) : null;
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content as JSONContent,
      version: doc.version,
      updatedAt: doc.updatedAt,
      updatedByName: updatedBy?.name ?? null,
      owner: doc.owner,
      role,
    };
  },

  /**
   * Optimistic concurrency: the write only applies if the row is still at `baseVersion`.
   * If someone else saved in between we raise 409 instead of silently overwriting their work.
   */
  async update(
    userId: string,
    documentId: string,
    input: { title?: string; content?: JSONContent; baseVersion: number; force?: boolean },
  ) {
    await authorize(userId, documentId, "edit");
    const changed = await documentRepository.updateIfVersion(
      documentId,
      input.force ? null : input.baseVersion,
      {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content as Prisma.InputJsonValue }),
        updatedById: userId,
      },
    );
    const current = await documentRepository.findVersionInfo(documentId);

    if (changed === 0) {
      const by = current.updatedById ? await userRepository.findNameById(current.updatedById) : null;
      throw new ConflictError(`${by?.name ?? "Someone"} saved a newer version of this document.`, {
        currentVersion: current.version,
        updatedBy: by?.name ?? null,
      });
    }
    return { version: current.version, updatedAt: current.updatedAt, title: current.title };
  },

  async remove(userId: string, documentId: string) {
    await authorize(userId, documentId, "delete");
    await documentRepository.delete(documentId);
  },

  /** Uploaded file → new document owned by the uploader. */
  async importFile(userId: string, filename: string, bytes: Buffer) {
    const { title, content } = await fileToDocument(filename, bytes);
    return this.create(userId, { title, content });
  },

  async exportMarkdown(userId: string, documentId: string) {
    const { doc } = await authorize(userId, documentId, "export");
    const markdown = docToMarkdown(doc.content as JSONContent, doc.title);
    const filename = doc.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";
    return { markdown, filename: `${filename}.md` };
  },
};
