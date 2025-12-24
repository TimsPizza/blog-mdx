import {
  getContentStore,
  listAllCategories,
  listDocuments,
} from "@/lib/server/content-store";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";
import { AppError } from "@/types/error";
import { err, errAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

const DEFAULT_CATEGORY = "default";

export async function GET() {
  return listAllCategories()
    .orElse(() =>
      listDocuments().map((docs) =>
        docs
          .map((doc) => doc.path.split("/")[0])
          .filter((item): item is string => Boolean(item)),
      ),
    )
    .map((categories) => {
      if (!categories.includes(DEFAULT_CATEGORY)) {
        return [DEFAULT_CATEGORY, ...categories];
      }
      return categories;
    })
    .match(
      (categories) => NextResponse.json({ items: categories }),
      jsonError,
    );
}

export async function POST(request: Request) {
  return requireAdminResult()
    .andThen(() =>
      ResultAsync.fromPromise(
        request.json() as Promise<unknown>,
        () => AppError.invalidRequest("Invalid JSON body"),
      ).andThen((body) => {
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return err(AppError.invalidRequest("Invalid payload"));
        }
        const name =
          typeof (body as { name?: unknown }).name === "string"
            ? (body as { name: string }).name.trim()
            : "";
        if (!name) {
          return err(AppError.invalidRequest("Category name is required"));
        }
        if (name.includes("/")) {
          return err(AppError.invalidRequest("Category must be a single segment"));
        }
        return getContentStore().match(
          (store) => store.createCategory(name).map(() => ({ name })),
          (error) => errAsync(error),
        );
      }),
    )
    .match(
      (payload) => NextResponse.json(payload),
      jsonError,
    );
}

export async function DELETE(request: Request) {
  return requireAdminResult()
    .andThen(() =>
      ResultAsync.fromPromise(
        request.json() as Promise<unknown>,
        () => AppError.invalidRequest("Invalid JSON body"),
      ).andThen((body) => {
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return err(AppError.invalidRequest("Invalid payload"));
        }
        const name =
          typeof (body as { name?: unknown }).name === "string"
            ? (body as { name: string }).name.trim()
            : "";
        const mode =
          typeof (body as { mode?: unknown }).mode === "string"
            ? (body as { mode: string }).mode
            : "";
        if (!name) {
          return err(AppError.invalidRequest("Category name is required"));
        }
        if (name === DEFAULT_CATEGORY) {
          return err(AppError.forbidden("Default category cannot be deleted"));
        }
        return getContentStore().match(
          (store) =>
            store.listDocsByCategory(name).andThen((docs) => {
              const hasDocs = docs.length > 0;
              if (hasDocs && mode !== "delete" && mode !== "move") {
                return err(
                  AppError.invalidRequest(
                    "Mode is required when category contains documents",
                  ),
                );
              }
              if (mode === "move") {
                return store
                  .createCategory(DEFAULT_CATEGORY)
                  .andThen(() =>
                    ResultAsync.combine(
                      docs.map((doc) =>
                        store.changeDocCategory(doc.path, DEFAULT_CATEGORY),
                      ),
                    ),
                  )
                  .andThen(() => store.deleteCategory(name))
                  .map(() => ({
                    name,
                    deleted: true as const,
                    moved: docs.length,
                    removed: 0,
                  }));
              }
              if (mode === "delete") {
                return ResultAsync.combine(
                  docs.map((doc) =>
                    store.deleteDoc({
                      path: doc.path,
                      sha: doc.sha,
                      message: `chore: delete ${doc.path}`,
                    }),
                  ),
                )
                  .andThen(() => store.deleteCategory(name))
                  .map(() => ({
                    name,
                    deleted: true as const,
                    moved: 0,
                    removed: docs.length,
                  }));
              }
              return store.deleteCategory(name).map(() => ({
                name,
                deleted: true as const,
                moved: 0,
                removed: docs.length,
              }));
            }),
          (error) => errAsync(error),
        );
      }),
    )
    .match(
      (payload) => NextResponse.json(payload),
      jsonError,
    );
}
