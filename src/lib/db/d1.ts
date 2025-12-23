import * as schema from "@/lib/db/schema";
import { AppError } from "@/types/error";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { err, ok, okAsync, ResultAsync } from "neverthrow";

export type SqlParam = string | number | null;

export interface D1ClientConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

type D1ResultRow = Record<string, unknown>;

interface D1ExecuteResponse<T = D1ResultRow> {
  success: boolean;
  result?:
    | {
      results?: T[];
      rows?: T[];
    }
    | Array<
        | T
        | {
            results?: T[];
            rows?: T[];
          }
      >;
  errors?: Array<{ message: string }>;
}

export class D1Client {
  private readonly accountId: string;
  private readonly databaseId: string;
  private readonly apiToken: string;

  constructor(config: D1ClientConfig) {
    this.accountId = config.accountId;
    this.databaseId = config.databaseId;
    this.apiToken = config.apiToken;
  }

  query<T = D1ResultRow>(
    sql: string,
    params: SqlParam[] = [],
  ): ResultAsync<T[], AppError> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/raw`;
    return ResultAsync.fromPromise<Response, AppError>(
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params }),
      }),
      (error) =>
        AppError.fromUnknown(error, {
          tag: "DB",
          message: "D1 request failed",
        }),
    ).andThen((res) => {
      if (!res.ok) {
        return ResultAsync.fromPromise<string, AppError>(
          res.text(),
          (error) =>
            AppError.fromUnknown(error, {
              tag: "DB",
              message: "D1 error response parse failed",
            }),
        ).andThen((text) =>
          err(
            new AppError({
              code: "INTERNAL",
              message: `D1 query failed: ${res.status} ${text}`,
              tag: "DB",
              expose: false,
            }),
          ),
        );
      }
      return ResultAsync.fromPromise<D1ExecuteResponse<T>, AppError>(
        res.json() as Promise<D1ExecuteResponse<T>>,
        (error) =>
          AppError.fromUnknown(error, {
            tag: "DB",
            message: "D1 response parse failed",
          }),
      ).andThen((json) => {
        if (!json.success) {
          const message =
            json.errors?.map((e) => e.message).join("; ") ?? "error";
          return err(
            new AppError({
              code: "INTERNAL",
              message: `D1 query error: ${message}`,
              tag: "DB",
              expose: false,
            }),
          );
        }
        return ok(normalizeD1Result<T>(json.result));
      });
    });
  }

  async queryOrThrow<T = D1ResultRow>(
    sql: string,
    params: SqlParam[] = [],
  ): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.match(
      (value) => value,
      (error) => {
        throw error;
      },
    );
  }
}

type ColumnarResult = { columns?: string[]; rows?: unknown[][] };

function normalizeD1Result<T = D1ResultRow>(
  result: D1ExecuteResponse<T>["result"],
): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length === 0) return [];
    const first = result[0] as unknown;
    if (first && typeof first === "object") {
      if ("results" in first) {
        return normalizeD1Result<T>(
          (first as { results?: D1ExecuteResponse<T>["result"] }).results,
        );
      }
      if ("rows" in first) {
        return normalizeFromRows<T>(first as ColumnarResult);
      }
    }
    return result as T[];
  }
  if (typeof result === "object") {
    if ("results" in result) {
      return normalizeD1Result<T>(
        (result as { results?: D1ExecuteResponse<T>["result"] }).results,
      );
    }
    if ("rows" in result) {
      return normalizeFromRows<T>(result as ColumnarResult);
    }
  }
  return [];
}

function normalizeFromRows<T = D1ResultRow>(result: ColumnarResult): T[] {
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const columns = Array.isArray(result.columns) ? result.columns : [];
  if (columns.length === 0) {
    return rows as T[];
  }
  return rows.map((row) => {
    const record: D1ResultRow = {};
    columns.forEach((column, index) => {
      record[column] = row?.[index] ?? null;
    });
    return record as T;
  });
}

export class ViewsRepository {
  constructor(private readonly db: D1Client | null) {}

  increment(slug: string): ResultAsync<number | null, AppError> {
    const db = this.db;
    if (!db) return okAsync(null);
    return db
      .query<{ count: number }>(
        "SELECT count FROM views WHERE slug = ?1",
        [slug],
      )
      .andThen((rows) => {
        const current = rows[0]?.count ?? 0;
        const next = current + 1;
        return db
          .query(
            "INSERT OR REPLACE INTO views (slug, count) VALUES (?1, ?2)",
            [slug, next],
          )
          .map(() => next);
      });
  }

  getCount(slug: string): ResultAsync<number | null, AppError> {
    const db = this.db;
    if (!db) return okAsync(null);
    return db
      .query<{ count: number }>("SELECT count FROM views WHERE slug = ?1", [
        slug,
      ])
      .map((rows) => rows[0]?.count ?? 0);
  }
}

export interface VisitRecord {
  slug: string;
  ip: string | null;
  ua: string | null;
  createdAt: string;
}

export class VisitsRepository {
  constructor(private readonly db: D1Client | null) {}

  recordVisit(
    slug: string,
    ip: string | null,
    ua: string | null,
  ): ResultAsync<void, AppError> {
    const db = this.db;
    if (!db) return okAsync(undefined);
    return db
      .query(
        "INSERT INTO visits (slug, ip, ua, created_at) VALUES (?1, ?2, ?3, datetime('now'))",
        [slug, ip, ua],
      )
      .map(() => undefined);
  }
}

export interface LogRecord {
  level: "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
}

export class LogsRepository {
  constructor(private readonly db: D1Client | null) {}

  write(log: LogRecord): ResultAsync<void, AppError> {
    const db = this.db;
    if (!db) return okAsync(undefined);
    return db
      .query(
        "INSERT INTO logs (level, message, meta, created_at) VALUES (?1, ?2, ?3, datetime('now'))",
        [log.level, log.message, JSON.stringify(log.meta ?? {})],
      )
      .map(() => undefined);
  }
}

export function createD1ClientFromEnv(): D1Client | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) {
    return null;
  }
  return new D1Client({ accountId, databaseId, apiToken });
}

export function createDrizzle(client: D1Client | null) {
  if (!client) return null;
  return drizzle(
    async (sql, params, method) => {
      const normalizedParams = params.map((value) =>
        value === undefined || value === null ? null : (value as SqlParam),
      );
      const rows = await client.queryOrThrow(sql, normalizedParams);
      const normalizedRows = rows.map((row) => {
        if (Array.isArray(row)) return row;
        if (row && typeof row === "object") {
          return Object.values(row);
        }
        return row;
      });
      if (method === "get") {
        return { rows: normalizedRows[0] ?? null };
      }
      return { rows: normalizedRows };
    },
    { schema },
  );
}

export function createDrizzleFromEnv() {
  const client = createD1ClientFromEnv();
  return createDrizzle(client);
}

export type DrizzleDb = NonNullable<ReturnType<typeof createDrizzle>>;
