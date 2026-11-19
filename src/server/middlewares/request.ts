import { BadRequestError } from "@/lib/errors";

export async function readJson(req: Request): Promise<unknown> {
  if (req.headers.get("content-length") === "0") return {};
  try {
    return await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
}

/** Next 15 passes dynamic route params as a Promise. */
export type Params<T extends Record<string, string>> = { params: Promise<T> };
