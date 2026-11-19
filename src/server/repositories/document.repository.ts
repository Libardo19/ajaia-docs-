import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

/** Data access for documents. No business rules here: access and conflicts live in services. */
export const documentRepository = {
  /** Document + the minimum needed to resolve the caller's role. */
  findWithAccess(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        shares: { select: { userId: true, role: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  },

  listOwnedBy(ownerId: string) {
    return prisma.document.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: { id: true, name: true } },
        _count: { select: { shares: true } },
      },
    });
  },

  create(data: { title: string; content: Prisma.InputJsonValue; ownerId: string }) {
    return prisma.document.create({
      data: { ...data, updatedById: data.ownerId },
      select: { id: true, title: true },
    });
  },

  /**
   * Conditional write: only applies when the row is still at `expectedVersion`
   * (pass null to skip the check). Returns how many rows changed (0 = conflict).
   */
  async updateIfVersion(
    id: string,
    expectedVersion: number | null,
    data: { title?: string; content?: Prisma.InputJsonValue; updatedById: string },
  ): Promise<number> {
    const result = await prisma.document.updateMany({
      where: expectedVersion === null ? { id } : { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    return result.count;
  },

  findVersionInfo(id: string) {
    return prisma.document.findUniqueOrThrow({
      where: { id },
      select: { version: true, updatedAt: true, updatedById: true, title: true },
    });
  },

  delete(id: string) {
    return prisma.document.delete({ where: { id } });
  },
};
