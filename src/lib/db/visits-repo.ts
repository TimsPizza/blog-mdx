import { visits, type Visit } from "@/lib/db/schema";
import { AppError } from "@/types/error";
import { and, desc, eq, gte, like, lte, sql, type SQL } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import type { DrizzleDb } from "./d1";

type VisitFilters = {
  articlePath?: string;
  articleUid?: string;
  ip?: string;
  ua?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

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

  list(filters: VisitFilters = {}): ResultAsync<Visit[], AppError> {
    const conditions: SQL<unknown>[] = [];
    if (filters.articlePath) {
      conditions.push(like(visits.articlePath, `%${filters.articlePath}%`));
    }
    if (filters.articleUid) {
      conditions.push(eq(visits.articleUid, filters.articleUid));
    }
    if (filters.ip) {
      conditions.push(like(visits.ip, `%${filters.ip}%`));
    }
    if (filters.ua) {
      conditions.push(like(visits.ua, `%${filters.ua}%`));
    }
    if (filters.from) {
      conditions.push(gte(visits.createdAt, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(visits.createdAt, filters.to));
    }

    let query = this.db.select().from(visits).$dynamic();
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(visits.createdAt), desc(visits.id));
    if (typeof filters.limit === "number") {
      query = query.limit(filters.limit);
    }
    if (typeof filters.offset === "number" && filters.offset > 0) {
      query = query.offset(filters.offset);
    }

    return ResultAsync.fromPromise(query, (error) =>
      AppError.fromUnknown(error, {
        tag: "DB",
        message: "Failed to load visits",
      }),
    );
  }
}
