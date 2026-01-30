import { visits } from "@/lib/db/schema";
import { AppError } from "@/types/error";
import { eq, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import type { DrizzleDb } from "./d1";

export class VisitsRepository {
  constructor(private readonly db: DrizzleDb) {}

  recordVisit(params: {
    articlePath: string;
    articleUid: string;
    ip: string | null;
    ua: string | null;
  }): ResultAsync<void, AppError> {
    console.log(`record visit for ${params.articlePath}`);
    return ResultAsync.fromPromise(
      this.db.insert(visits).values({
        articlePath: params.articlePath,
        articleUid: params.articleUid,
        ip: params.ip,
        ua: params.ua,
      }),
      (error) =>
        AppError.fromUnknown(error, {
          tag: "DB",
          message: "Failed to save visit",
        }),
    ).map(() => undefined);
  }

  countByArticleUid(articleUid: string): ResultAsync<number, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(eq(visits.articleUid, articleUid))
        .get(),
      (error) =>
        AppError.fromUnknown(error, {
          tag: "DB",
          message: "Failed to count visits",
        }),
    ).map((row) => Number(row?.count ?? 0));
  }
}
