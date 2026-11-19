/** Typed domain errors. Route handlers map them to HTTP in one place (see server/http.ts). */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "bad_request", details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "You need to sign in.") {
    super(message, 401, "unauthorized");
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, 403, "forbidden");
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404, "not_found");
  }
}
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "conflict", details);
  }
}
export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super(message, 413, "payload_too_large");
  }
}
export class UnsupportedMediaError extends AppError {
  constructor(message: string) {
    super(message, 415, "unsupported_media_type");
  }
}
