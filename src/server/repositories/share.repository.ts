import type { ShareRole } from "@prisma/client";
import { prisma } from "../db";

const shareWithUser = {
  role: true,
  user: { select: { id: true, name: true, email: true, color: true } },
} as const;

/** Data access for document shares (who can see/edit what). */
export const shareRepository = {
  listSharedWith(userId: string) {
    return prisma.documentShare.findMany({
      where: { userId },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: { id: true, title: true, updatedAt: true, owner: { select: { id: true, name: true } } },
        },
      },
    });
  },

  listForDocument(documentId: string) {
    return prisma.documentShare.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
      select: shareWithUser,
    });
  },

  upsert(documentId: string, userId: string, role: ShareRole) {
    return prisma.documentShare.upsert({
      where: { documentId_userId: { documentId, userId } },
      create: { documentId, userId, role },
      update: { role },
      select: shareWithUser,
    });
  },

  remove(documentId: string, userId: string) {
    return prisma.documentShare.deleteMany({ where: { documentId, userId } });
  },
};
