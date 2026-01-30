// app-error.ts
export type AppErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL";

export type AppErrorTag =
  | "VALIDATION"
  | "AUTH"
  | "DB"
  | "FETCH"
  | "ENV"
  | "UNKNOWN";

export type PublicErrorPayload = {
  code: AppErrorCode;
  message: string;
};

/**
 * Global error type for neverthrow usage:
 * - Business layer: return err(AppError.xxx(...))
 * - Third-party boundary: catch unknown -> AppError.fromUnknown(...) -> err(...)
 * - Boundary: match once -> status + payload
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly expose: boolean; // Whether to expose message to clients
  readonly tag: AppErrorTag;
  readonly details?: Record<string, unknown>;

  constructor(opts: {
    code: AppErrorCode;
    message: string;
    status?: number; // Defaults to code mapping
    expose?: boolean; // Defaults to code exposure rule
    tag?: AppErrorTag;
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    // Next.js runtime supports ErrorOptions.cause
    super(opts.message, { cause: opts.cause } as ErrorOptions);
    this.name = "AppError";

    this.code = opts.code;
    this.status = opts.status ?? codeToStatus(opts.code);
    this.expose = opts.expose ?? codeToExpose(opts.code);
    this.tag = opts.tag ?? "UNKNOWN";
    this.details = opts.details;

    // Ensure instanceof works across runtimes
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Safe payload for clients. */
  publicPayload(): PublicErrorPayload {
    return {
      code: this.code,
      message: this.expose ? this.message : "Internal error",
    };
  }

  /** Normalize unknown into AppError without double-wrapping. */
  static fromUnknown(
    e: unknown,
    ctx?: {
      tag?: AppErrorTag;
      code?: AppErrorCode; // Defaults to INTERNAL
      message?: string; // Defaults to "Internal error"
      details?: Record<string, unknown>;
    },
  ): AppError {
    if (e instanceof AppError) return e;
    return new AppError({
      code: ctx?.code ?? "INTERNAL",
      message: ctx?.message ?? "Internal error",
      tag: ctx?.tag ?? "UNKNOWN",
      expose: false,
      details: ctx?.details,
      cause: e,
    });
  }

  // Common factories to keep status/expose consistent.
  static invalidRequest(
    message = "Invalid request",
    details?: Record<string, unknown>,
  ) {
    return new AppError({
      code: "INVALID_REQUEST",
      message,
      tag: "VALIDATION",
      expose: true,
      details,
    });
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError({
      code: "UNAUTHORIZED",
      message,
      tag: "AUTH",
      expose: true,
    });
  }

  static forbidden(message = "Forbidden") {
    return new AppError({
      code: "FORBIDDEN",
      message,
      tag: "AUTH",
      expose: true,
    });
  }

  static notFound(message = "Not found") {
    return new AppError({ code: "NOT_FOUND", message, expose: true });
  }

  static conflict(message = "Conflict", details?: Record<string, unknown>) {
    return new AppError({ code: "CONFLICT", message, expose: true, details });
  }

  static internal(
    tag: AppErrorTag = "UNKNOWN",
    cause?: unknown,
    details?: Record<string, unknown>,
  ) {
    return new AppError({
      code: "INTERNAL",
      message: "Internal error",
      tag,
      expose: false,
      cause,
      details,
    });
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

function codeToStatus(code: AppErrorCode): number {
  switch (code) {
    case "INVALID_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "TOO_MANY_REQUESTS":
      return 429;
    case "INTERNAL":
    default:
      return 500;
  }
}

function codeToExpose(code: AppErrorCode): boolean {
  // These are expected failures, message can be exposed.
  switch (code) {
    case "INVALID_REQUEST":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
    case "NOT_FOUND":
    case "CONFLICT":
    case "TOO_MANY_REQUESTS":
      return true;
    case "INTERNAL":
    default:
      return false;
  }
}
