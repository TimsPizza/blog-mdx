import { createDrizzleFromEnv, type DrizzleDb } from "@/lib/db/d1";
import { AppError } from "@/types/error";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
};

export const getClientIp = (request: Request): string | null => {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
};

export const parseIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "number") return item;
        if (typeof item === "string" && item.trim()) return Number(item);
        return NaN;
      })
      .filter((item) => Number.isFinite(item));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [value];
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? [parsed] : [];
  }
  return [];
};

export const normalizeTimestamp = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const requireDb = (): ResultAsync<DrizzleDb, AppError> => {
  const db = createDrizzleFromEnv();
  if (!db) {
    return errAsync(
      new AppError({
        code: "INTERNAL",
        message: "Database is not configured",
        tag: "DB",
        expose: false,
      }),
    );
  }
  return okAsync(db);
};
