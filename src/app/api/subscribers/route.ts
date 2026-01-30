import { SubscribersRepository } from "@/lib/db/subscribers-repo";
import { isSubscribeEnabled } from "@/lib/server/subscribe-flag";
import { getClientIp, isRecord, normalizeEmail, requireDb } from "@/lib/util";
import { AppError } from "@/types/error";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

const DAILY_LIMIT = Number(process.env.MAILGUN_DAILY_LIMIT ?? "30");
const WINDOW_MS = 24 * 60 * 60 * 1000;

type SubscribeResponse = {
  ok: true;
  data: {
    email: string;
    status: "subscribed" | "already_subscribed";
  };
};

type ErrorResponse = {
  ok: false;
  message: string;
  error: { code: string; message: string };
};

const respondOk = (data: SubscribeResponse["data"]) =>
  NextResponse.json({ ok: true, data } satisfies SubscribeResponse);

const respondError = (
  error: AppError,
  headers?: HeadersInit,
): NextResponse<ErrorResponse> =>
  NextResponse.json(
    {
      ok: false,
      message: error.publicPayload().message,
      error: error.publicPayload(),
    },
    {
      status: error.status,
      headers,
    },
  );

const checkRateLimit = (repo: SubscribersRepository) => {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  return repo.countSince(windowStart).andThen((count) => {
    if (
      Number.isFinite(DAILY_LIMIT) &&
      DAILY_LIMIT > 0 &&
      count >= DAILY_LIMIT
    ) {
      return errAsync(
        new AppError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many subscriptions today. Please try again tomorrow.",
          tag: "VALIDATION",
          expose: true,
          details: { retryAfter: Math.ceil(WINDOW_MS / 1000) },
        }),
      );
    }
    return okAsync(undefined);
  });
};

export async function POST(request: Request) {
  if (!isSubscribeEnabled()) {
    return respondError(
      AppError.forbidden("Subscriptions are currently disabled."),
    );
  }
  const payload = await ResultAsync.fromPromise(
    request.json() as Promise<unknown>,
    (error) =>
      AppError.fromUnknown(error, {
        tag: "VALIDATION",
        message: "Invalid JSON payload",
      }),
  )
    .andThen((body) => {
      if (!isRecord(body)) {
        return errAsync(AppError.invalidRequest("Invalid payload"));
      }
      const email = normalizeEmail(body.email);
      if (!email) {
        return errAsync(AppError.invalidRequest("Invalid email"));
      }
      const source =
        typeof body.source === "string" && body.source.trim()
          ? body.source.trim()
          : "web";
      return okAsync({ email, source });
    })
    .andThen(({ email, source }) =>
      requireDb().andThen((db) => {
        const repo = new SubscribersRepository(db);
        return repo.findByEmail(email).andThen((existing) => {
          if (existing?.status === "active") {
            return okAsync<SubscribeResponse["data"], AppError>({
              email,
              status: "already_subscribed",
            });
          }
          return checkRateLimit(repo).andThen(() => {
            const now = new Date();
            const ip = getClientIp(request);
            const userAgent = request.headers.get("user-agent");
            const payload = {
              email,
              status: "active" as const,
              source,
              ip,
              user_agent: userAgent,
              created_at: now,
              updated_at: now,
            };

            if (existing) {
              return repo
                .updateByEmail(email, payload)
                .map(() => ({ email, status: "subscribed" as const }));
            }

            return repo
              .insert(payload)
              .map(() => ({ email, status: "subscribed" as const }));
          });
        });
      }),
    );

  return payload.match(
    (data) => respondOk(data),
    (error) => {
      if (error.code === "TOO_MANY_REQUESTS") {
        return respondError(error, {
          "Retry-After": String(Math.ceil(WINDOW_MS / 1000)),
        });
      }
      return respondError(error);
    },
  );
}
