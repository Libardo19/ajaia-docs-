import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export type ApiError = { error: { code: string; message: string; details?: unknown } };

/** Maps any thrown error to the API's single error shape. */
export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json<ApiError>(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json<ApiError>(
      {
        error: {
          code: "validation_error",
          message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.",
          details: err.issues,
        },
      },
      { status: 400 },
    );
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json<ApiError>(
    { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

export type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Outermost middleware: nothing a controller throws escapes as an HTML 500. */
export function withErrors<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
