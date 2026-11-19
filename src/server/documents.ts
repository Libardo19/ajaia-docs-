import "server-only";
import type { Prisma } from "@prisma/client";
import type { JSONContent } from "@tiptap/core";
import { prisma } from "./db";
import { assertCan, resolveRole, type Role } from "@/lib/access";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { EMPTY_DOC } from "@/lib/editor-extensions";

const withShares = { shares: { select: { userId: true, role: true } } } as const;

async function loadWithRole(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { ...withShares, owner: { select: { id: true, name: true, email: true } } },
  });
  if (!doc) throw new NotFoundError("Document not found.");
  return { doc, role: resolveRole(doc, userId) };
}

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  owner: { id: string; name: string };
  role: Role;
};

export async function listDocumentsForUser(userId: string) {
  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: { id: true, name: true } },
        _count: { select: { shares: true } },
      },
    }),
    prisma.documentShare.findMany({
      where: { userId },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: { id: true, title: true, updatedAt: true, owner: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);
  return {
    owned: owned.map(({ _count, ...d }) => ({ ...d, role: "owner" as Role, shareCount: _count.shares })),
    shared: shared.map((s) => ({
      ...s.document,
      role: (s.role === "EDITOR" ? "editor" : "viewer") as Role,
    })),
  };
}

export async function createDocument(userId: string, input: { title?: string; content?: JSONContent }) {
  return prisma.document.create({
    data: {
      title: input.title ?? "Untitled document",
      content: (input.content ?? EMPTY_DOC) as Prisma.InputJsonValue,
      ownerId: userId,
      updatedById: userId,
    },
    select: { id: true, title: true },
  });
}

export async function getDocumentForUser(userId: string, documentId: string) {
  const { doc, role } = await loadWithRole(userId, documentId);
  assertCan(role, "read");
  const updatedBy = doc.updatedById
    ? await prisma.user.findUnique({ where: { id: doc.updatedById }, select: { name: true } })
    : null;
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
}

/**
 * Optimistic concurrency: the write only applies if the row is still at `baseVersion`.
 * If someone else saved in between we return 409 instead of silently overwriting their work.
 */
export async function updateDocument(
  userId: string,
  documentId: string,
  input: { title?: string; content?: JSONContent; baseVersion: number; force?: boolean },
) {
  const { role } = await loadWithRole(userId, documentId);
  assertCan(role, "edit");

  const result = await prisma.document.updateMany({
    where: input.force ? { id: documentId } : { id: documentId, version: input.baseVersion },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content as Prisma.InputJsonValue }),
      version: { increment: 1 },
      updatedById: userId,
    },
  });

  const current = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    select: { version: true, updatedAt: true, updatedById: true, title: true },
  });

  if (result.count === 0) {
    const by = current.updatedById
      ? await prisma.user.findUnique({ where: { id: current.updatedById }, select: { name: true } })
      : null;
    throw new ConflictError(
      `${by?.name ?? "Someone"} saved a newer version of this document.`,
      { currentVersion: current.version, updatedBy: by?.name ?? null },
    );
  }
  return { version: current.version, updatedAt: current.updatedAt, title: current.title };
}

export async function deleteDocument(userId: string, documentId: string) {
  const { role } = await loadWithRole(userId, documentId);
  assertCan(role, "delete");
  await prisma.document.delete({ where: { id: documentId } });
}

export async function listShares(userId: string, documentId: string) {
  const { role } = await loadWithRole(userId, documentId);
  assertCan(role, "read");
  return prisma.documentShare.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: { role: true, user: { select: { id: true, name: true, email: true, color: true } } },
  });
}

export async function upsertShare(
  userId: string,
  documentId: string,
  input: { email: string; role: "VIEWER" | "EDITOR" },
) {
  const { doc, role } = await loadWithRole(userId, documentId);
  assertCan(role, "share");
  const target = await prisma.user.findUnique({ where: { email: input.email } });
  if (!target) throw new NotFoundError(`No user with email ${input.email}.`);
  if (target.id === doc.ownerId) throw new BadRequestError("The owner already has full access.");
  return prisma.documentShare.upsert({
    where: { documentId_userId: { documentId, userId: target.id } },
    create: { documentId, userId: target.id, role: input.role },
    update: { role: input.role },
    select: { role: true, user: { select: { id: true, name: true, email: true, color: true } } },
  });
}

export async function removeShare(userId: string, documentId: string, targetUserId: string) {
  const { role } = await loadWithRole(userId, documentId);
  assertCan(role, "share");
  await prisma.documentShare.deleteMany({ where: { documentId, userId: targetUserId } });
}
