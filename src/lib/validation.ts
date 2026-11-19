import { z } from "zod";

const MAX_CONTENT_BYTES = 1_000_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(200, "Title must be 200 characters or fewer");

/** Tiptap JSON: we only check the envelope and size; the editor schema rejects unknown nodes on load. */
export const contentSchema = z
  .object({ type: z.literal("doc"), content: z.array(z.record(z.string(), z.unknown())).optional() })
  .passthrough()
  .refine((v) => JSON.stringify(v).length <= MAX_CONTENT_BYTES, "Document is too large (max ~1 MB)");

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
    baseVersion: z.number().int().positive(),
    /** true = overwrite even if someone saved in between (user explicitly chose "keep mine"). */
    force: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export const loginSchema = z.object({ userId: z.string().min(1) });
