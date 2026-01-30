import { requireAdminResult } from "@/lib/server/admin-auth";
import {
  isSubscribeEnabled,
  setSubscribeEnabled,
} from "@/lib/server/subscribe-flag";
import { AppError } from "@/types/error";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type SubscribeFlagResponse = {
  ok: true;
  data: { enabled: boolean };
};

type ErrorResponse = {
  ok: false;
  message: string;
  error: { code: string; message: string };
};

const respondOk = (enabled: boolean) =>
  NextResponse.json(
    { ok: true, data: { enabled } } satisfies SubscribeFlagResponse,
  );

const respondError = (error: AppError): NextResponse<ErrorResponse> =>
  NextResponse.json(
    {
      ok: false,
      message: error.publicPayload().message,
      error: error.publicPayload(),
    },
    { status: error.status },
  );

export async function GET() {
  const result = requireAdminResult().map(() =>
    respondOk(isSubscribeEnabled()),
  );
  return result.match(
    (payload) => payload,
    (error) => respondError(error),
  );
}

export async function POST(request: Request) {
  const result = requireAdminResult().andThen(() =>
    ResultAsync.fromPromise(request.json() as Promise<unknown>, (error) =>
      AppError.fromUnknown(error, {
        tag: "VALIDATION",
        message: "Invalid JSON payload",
      }),
    ).andThen((body) => {
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return errAsync(AppError.invalidRequest("Invalid payload"));
      }
      const enabled = (body as { enabled?: unknown }).enabled;
      if (typeof enabled !== "boolean") {
        return errAsync(AppError.invalidRequest("enabled is required"));
      }
      return okAsync(setSubscribeEnabled(enabled));
    }),
  );

  return result.match(
    (enabled) => respondOk(enabled),
    (error) => respondError(error),
  );
}
