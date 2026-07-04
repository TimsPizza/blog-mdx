import { VisitsRepository } from "@/lib/db/visits-repo";
import { jsonError } from "@/lib/server/http";
import { getClientIp, isRecord, requireDb, stringValue } from "@/lib/util";
import { AppError } from "@/types/error";
import { errAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type VisitPayload = {
  articlePath: string;
  articleUid: string;
};

export async function POST(request: Request) {
  const result = ResultAsync.fromPromise(
    request.json() as Promise<unknown>,
    () => AppError.invalidRequest("Invalid JSON body"),
  )
    .andThen((body) => {
      if (!isRecord(body)) {
        return errAsync(AppError.invalidRequest("Invalid visit payload"));
      }
      const articlePath = stringValue(body.articlePath);
      const articleUid = stringValue(body.articleUid);
      if (!articlePath || !articleUid) {
        return errAsync(
          AppError.invalidRequest("Article path and uid are required"),
        );
      }
      return requireDb().map((db) => ({
        db,
        payload: { articlePath, articleUid } satisfies VisitPayload,
      }));
    })
    .andThen(({ db, payload }) =>
      new VisitsRepository(db)
        .recordVisit({
          ...payload,
          ip: getClientIp(request),
          ua: request.headers.get("user-agent"),
        })
        .map(() => ({ ok: true as const })),
    );

  return result.match(
    (payload) => NextResponse.json(payload, { status: 202 }),
    (error) => jsonError(error),
  );
}
