import { VisitsRepository } from "@/lib/db/visits-repo";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";
import { AppError } from "@/types/error";
import { requireDb, stringValue } from "@/lib/util";
import { errAsync } from "neverthrow";
import { NextResponse } from "next/server";

type AdminVisitItem = {
  id: number;
  articleUid: string;
  articlePath: string;
  ip: string | null;
  ua: string | null;
  createdAt: string;
};

type AdminListResponse = {
  ok: true;
  data: { items: AdminVisitItem[] };
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

const respondError = (error: AppError) => {
  console.error("[api/admin/visits]", {
    code: error.code,
    message: error.message,
    tag: error.tag,
    status: error.status,
  });
  return jsonError(error);
};

const parseDateParam = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseLimit = (value: string | null) => {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
};

const parseOffset = (value: string | null) => {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articlePath = stringValue(searchParams.get("articlePath"));
  const articleUid = stringValue(searchParams.get("articleUid"));
  const ip = stringValue(searchParams.get("ip"));
  const ua = stringValue(searchParams.get("ua"));
  const fromRaw = stringValue(searchParams.get("from"));
  const toRaw = stringValue(searchParams.get("to"));
  const from = parseDateParam(fromRaw);
  const to = parseDateParam(toRaw);

  if (fromRaw && from === null) {
    return respondError(AppError.invalidRequest("Invalid from date"));
  }
  if (toRaw && to === null) {
    return respondError(AppError.invalidRequest("Invalid to date"));
  }

  const limit = parseLimit(searchParams.get("limit"));
  const offset = parseOffset(searchParams.get("offset"));

  const result = requireAdminResult()
    .andThen(() => requireDb())
    .andThen((db) => {
      const repo = new VisitsRepository(db);
      return repo
        .list({
          articlePath,
          articleUid,
          ip,
          ua,
          from: from ?? undefined,
          to: to ?? undefined,
          limit,
          offset,
        })
        .map((rows) => {
          const items: AdminVisitItem[] = rows.map((row) => ({
            id: row.id,
            articleUid: row.articleUid,
            articlePath: row.articlePath,
            ip: row.ip ?? null,
            ua: row.ua ?? null,
            createdAt: row.createdAt,
          }));
          return { ok: true, data: { items } } satisfies AdminListResponse;
        });
    });

  return result.match(
    (payload) => NextResponse.json(payload),
    (error) => respondError(error),
  );
}
