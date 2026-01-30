import { SubscribersRepository } from "@/lib/db/subscribers-repo";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";
import { AppError } from "@/types/error";
import {
  isRecord,
  normalizeTimestamp,
  parseIds,
  requireDb,
  stringValue,
} from "@/lib/util";
import { errAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type AdminSubscriberItem = {
  id: number;
  email: string;
  status: "active" | "unsubscribed";
  source: string | null;
  created_at: number;
  updated_at: number;
};

type AdminListResponse = {
  ok: true;
  data: { items: AdminSubscriberItem[] };
};

type AdminActionResponse = {
  ok: true;
  data: { updated: number };
};
type SubscriberStatus = "active" | "unsubscribed";

const respondError = (error: AppError) => {
  console.error("[api/admin/subscribers]", {
    code: error.code,
    message: error.message,
    tag: error.tag,
    status: error.status,
  });
  return jsonError(error);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = stringValue(searchParams.get("status"));

  const result = requireAdminResult()
    .andThen(() => requireDb())
    .andThen((db) => {
      const normalizedStatus: SubscriberStatus | undefined =
        status === "active" || status === "unsubscribed" ? status : undefined;
      if (status && !normalizedStatus) {
        return errAsync(AppError.invalidRequest("Invalid status filter"));
      }
      const repo = new SubscribersRepository(db);
      return repo.list(normalizedStatus).map((rows) => {
        const items: AdminSubscriberItem[] = rows.map((row) => ({
          id: row.id,
          email: row.email,
          status: row.status,
          source: row.source ?? null,
          created_at: normalizeTimestamp(row.created_at),
          updated_at: normalizeTimestamp(row.updated_at),
        }));
        return { ok: true, data: { items } } satisfies AdminListResponse;
      });
    });

  return result.match(
    (payload) => NextResponse.json(payload),
    (error) => respondError(error),
  );
}

export async function POST(request: Request) {
  const result = requireAdminResult()
    .andThen(() => requireDb())
    .andThen((db) =>
      ResultAsync.fromPromise(
        request.json() as Promise<unknown>,
        (error) =>
          AppError.fromUnknown(error, {
            tag: "VALIDATION",
            message: "Invalid JSON payload",
          }),
      ).andThen((body) => {
        if (!isRecord(body)) {
          return errAsync(AppError.invalidRequest("Invalid payload"));
        }
        const action = stringValue(body.action ?? body.op);
        const ids = parseIds(body.ids ?? body.id);
        if (!action) {
          return errAsync(AppError.invalidRequest("action is required"));
        }
        if (ids.length === 0) {
          return errAsync(AppError.invalidRequest("ids are required"));
        }
        const now = new Date();
        const repo = new SubscribersRepository(db);

        switch (action) {
          case "archive":
            return repo
              .updateStatusByIds(ids, "unsubscribed", now)
              .map(
                (updated) =>
                  ({ ok: true, data: { updated } }) satisfies
                    AdminActionResponse,
              );
          case "unarchive":
            return repo
              .updateStatusByIds(ids, "active", now)
              .map(
                (updated) =>
                  ({ ok: true, data: { updated } }) satisfies
                    AdminActionResponse,
              );
          case "delete":
            return repo
              .deleteByIds(ids)
              .map(
                (updated) =>
                  ({ ok: true, data: { updated } }) satisfies
                    AdminActionResponse,
              );
          default:
            return errAsync(AppError.invalidRequest("Unsupported action"));
        }
      }),
    );

  return result.match(
    (payload) => NextResponse.json(payload),
    (error) => respondError(error),
  );
}
