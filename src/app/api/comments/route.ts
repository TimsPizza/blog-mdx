import { CommentsRepository } from "@/lib/db/comments-repo";
import {
  getClientIp,
  isRecord,
  normalizeEmail,
  requireDb,
  stringValue,
} from "@/lib/util";
import { AppError } from "@/types/error";
import { createHash } from "crypto";
import { errAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type CommentListItem = {
  id: number;
  authorName: string | null;
  content: string;
  createdAt: string;
  parentId: number | null;
  upvotes: number;
  downvotes: number;
};

type CommentListResponse = {
  ok: true;
  data: {
    items: CommentListItem[];
    archivedCount: number;
  };
};

type CommentSubmitResponse = {
  ok: true;
  data: {
    status: "pending";
  };
};

type ErrorResponse = {
  ok: false;
  message: string;
  error: { code: string; message: string };
};

const hashIp = (ip: string) => createHash("sha256").update(ip).digest("hex");

const respondOk = <T extends CommentListResponse | CommentSubmitResponse>(
  payload: T,
) => NextResponse.json(payload);

const respondError = (error: AppError): NextResponse<ErrorResponse> => (
  console.error("[api/comments]", {
    code: error.code,
    message: error.message,
    tag: error.tag,
    status: error.status,
  }),
  NextResponse.json(
    {
      ok: false,
      message: error.publicPayload().message,
      error: error.publicPayload(),
    },
    { status: error.status },
  )
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleUid = stringValue(
    searchParams.get("articleUid") ?? searchParams.get("uid"),
  );
  const articlePath = stringValue(
    searchParams.get("articlePath") ?? searchParams.get("path"),
  );
  const result = requireDb().andThen((db) => {
    const repo = new CommentsRepository(db);
    return repo
      .listApprovedCached({ articleUid, articlePath })
      .map(({ items, archivedCount }) => ({
        ok: true,
        data: { items, archivedCount },
      }) satisfies CommentListResponse);
  });

  return result.match(
    (payload) => respondOk(payload),
    (error) => respondError(error),
  );
}

export async function POST(request: Request) {
  const result = requireDb().andThen((db) =>
    ResultAsync.fromPromise(request.json() as Promise<unknown>, (error) =>
      AppError.fromUnknown(error, {
        tag: "VALIDATION",
        message: "Invalid JSON payload",
      }),
    ).andThen((body) => {
      if (!isRecord(body)) {
        return errAsync(AppError.invalidRequest("Invalid payload"));
      }
      const articleUid = stringValue(body.articleUid ?? body.uid);
      const articlePath = stringValue(body.articlePath ?? body.path);
      const content = stringValue(body.content);
      if (!articleUid || !articlePath) {
        return errAsync(
          AppError.invalidRequest("articleUid and articlePath are required"),
        );
      }
      if (!content) {
        return errAsync(AppError.invalidRequest("content is required"));
      }
      const parentIdRaw = body.parentId ?? body.parent_id;
      const parentId =
        typeof parentIdRaw === "number"
          ? parentIdRaw
          : typeof parentIdRaw === "string" && parentIdRaw.trim()
            ? Number(parentIdRaw)
            : null;
      const ip = getClientIp(request);
      const authorName = ip ?? "Anonymous";
      const authorEmail = normalizeEmail(body.authorEmail ?? body.email);
      const ipHash = ip ? hashIp(ip) : null;
      const userAgent = request.headers.get("user-agent");
      const now = new Date().toISOString();

      const repo = new CommentsRepository(db);
      return repo
        .insertComment({
          articleUid,
          articlePath,
          authorName,
          authorEmail,
          content,
          status: "pending",
          parentId: Number.isFinite(parentId) ? parentId : null,
          ipHash,
          userAgent,
          createdAt: now,
          updatedAt: now,
        })
        .map(
          () =>
            ({
              ok: true,
              data: { status: "pending" },
            }) satisfies CommentSubmitResponse,
        );
    }),
  );

  return result.match(
    (payload) => respondOk(payload),
    (error) => respondError(error),
  );
}
