import { CommentsRepository } from "@/lib/db/comments-repo";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";
import { isRecord, parseIds, requireDb, stringValue } from "@/lib/util";
import { AppError } from "@/types/error";
import { errAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type AdminCommentItem = {
  id: number;
  articleUid: string;
  articlePath: string;
  authorName: string | null;
  authorEmail: string | null;
  content: string;
  status: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
};

type AdminListResponse = {
  ok: true;
  data: { items: AdminCommentItem[] };
};

type AdminActionResponse = {
  ok: true;
  data: { updated: number };
};
type CommentStatus = "pending" | "approved" | "archived" | "spam" | "deleted";

const respondError = (error: AppError) => {
  console.error("[api/admin/comments]", {
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
      const normalizedStatus: CommentStatus | undefined =
        status === "pending" ||
        status === "approved" ||
        status === "archived" ||
        status === "spam" ||
        status === "deleted"
          ? status
          : undefined;
      if (status && !normalizedStatus) {
        return errAsync(AppError.invalidRequest("Invalid status filter"));
      }
      const repo = new CommentsRepository(db);
      return repo.listByStatus(normalizedStatus).map((rows) => {
        const items: AdminCommentItem[] = rows.map((row) => ({
          id: row.id,
          articleUid: row.articleUid,
          articlePath: row.articlePath,
          authorName: row.authorName ?? null,
          authorEmail: row.authorEmail ?? null,
          content: row.content,
          status: row.status,
          parentId: row.parentId ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
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
      ResultAsync.fromPromise(request.json() as Promise<unknown>, (error) =>
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
        const now = new Date().toISOString();
        const repo = new CommentsRepository(db);

        switch (action) {
          case "approve":
            return repo
              .approveAndInvalidate(ids, now)
              .map(
                (updated) =>
                  ({
                    ok: true,
                    data: { updated },
                  }) satisfies AdminActionResponse,
              );
          case "archive":
            return repo
              .updateStatus(ids, "archived", now)
              .map(
                (updated) =>
                  ({
                    ok: true,
                    data: { updated },
                  }) satisfies AdminActionResponse,
              );
          case "unarchive":
            return repo
              .updateStatus(ids, "approved", now)
              .map(
                (updated) =>
                  ({
                    ok: true,
                    data: { updated },
                  }) satisfies AdminActionResponse,
              );
          case "delete":
            return repo
              .deleteByIds(ids)
              .map(
                (updated) =>
                  ({
                    ok: true,
                    data: { updated },
                  }) satisfies AdminActionResponse,
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
