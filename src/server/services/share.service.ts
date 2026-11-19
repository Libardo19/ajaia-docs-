import "server-only";
import { authorize } from "./document.service";
import { shareRepository } from "../repositories/share.repository";
import { userRepository } from "../repositories/user.repository";
import { BadRequestError, NotFoundError } from "@/lib/errors";

export const shareService = {
  async list(userId: string, documentId: string) {
    await authorize(userId, documentId, "read");
    return shareRepository.listForDocument(documentId);
  },

  /** Grant or change access by email. Owner only. */
  async grant(userId: string, documentId: string, input: { email: string; role: "VIEWER" | "EDITOR" }) {
    const { doc } = await authorize(userId, documentId, "share");
    const target = await userRepository.findByEmail(input.email);
    if (!target) throw new NotFoundError(`No user with email ${input.email}.`);
    if (target.id === doc.ownerId) throw new BadRequestError("The owner already has full access.");
    return shareRepository.upsert(documentId, target.id, input.role);
  },

  async revoke(userId: string, documentId: string, targetUserId: string) {
    await authorize(userId, documentId, "share");
    await shareRepository.remove(documentId, targetUserId);
  },
};
