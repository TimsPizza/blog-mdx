import { CommentsRepository } from "@/lib/db/comments-repo";
import { AppError } from "@/types/error";
import { isRecord, requireDb, stringValue } from "@/lib/util";
import { errAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type VoteResponse = {
  ok: true;
  data: { id: number; upvotes: number; downvotes: number };
};

type ErrorResponse = {
  ok: false;
  message: string;
  error: { code: string; message: string };
};

const respondError = (error: AppError): NextResponse<ErrorResponse> => (
  console.error("[api/comments/vote]", {
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

export async function POST(request: Request) {
  const result = requireDb().andThen((db) =>
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
      const idRaw = body.id ?? body.commentId;
      const id =
        typeof idRaw === "number"
          ? idRaw
          : typeof idRaw === "string"
            ? Number(idRaw)
            : NaN;
      const direction = stringValue(body.direction ?? body.vote);
      if (!Number.isFinite(id)) {
        return errAsync(AppError.invalidRequest("Comment id is required"));
      }
      if (direction !== "up" && direction !== "down") {
        return errAsync(AppError.invalidRequest("Invalid vote direction"));
      }
      const repo = new CommentsRepository(db);
      return repo.incrementVote(id, direction).map((row) => ({
        ok: true,
        data: { id, upvotes: row.upvotes ?? 0, downvotes: row.downvotes ?? 0 },
      }));
    }),
  );

  return result.match(
    (payload) => NextResponse.json(payload satisfies VoteResponse),
    (error) => respondError(error),
  );
}
