import { prisma } from "../db";

/** Data access for users. The only layer allowed to talk to Prisma. */
const publicUser = { id: true, name: true, email: true, color: true } as const;

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUser });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: publicUser });
  },

  findNameById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { name: true } });
  },

  listAll() {
    return prisma.user.findMany({ orderBy: { name: "asc" }, select: publicUser });
  },
};
