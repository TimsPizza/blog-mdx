import { createD1ClientFromEnv, ViewsRepository } from "@/lib/db/d1";
import { getContentStore, listDocuments } from "@/lib/server/content-store";
import { jsonError } from "@/lib/server/http";
import { mapDocToPost } from "@/lib/server/posts";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { AppError } from "@/types/error";
import { err, errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  const slugKey = slugPath.replace(/\.mdx?$/, "");
  const url = new URL(_request.url);
  const pathParam = url.searchParams.get("path");
  const docResult = pathParam
    ? getContentStore().match(
        (store) => store.getDoc(pathParam),
        (error) => errAsync(error),
      )
    : listDocuments().andThen((docs) => {
        const doc = docs.find(
          (item) => item.path.replace(/\.mdx?$/, "") === slugKey,
        );
        if (!doc) {
          return err(AppError.notFound("Not found"));
        }
        return ok(doc);
      });

  const viewsRepo = new ViewsRepository(createD1ClientFromEnv());
  return docResult
    .andThen((doc) => {
      const post = mapDocToPost(doc);
      return viewsRepo
        .increment(slugKey)
        .orElse(() => okAsync(null))
        .map((views) => ({
          post,
          sha: doc.sha,
          views,
        }));
    })
    .match(
      (payload) => NextResponse.json(payload),
      jsonError,
    );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  return requireAdminResult()
    .andThen(() =>
      ResultAsync.fromPromise(
        request.json() as Promise<unknown>,
        () => AppError.invalidRequest("Invalid JSON body"),
      ).andThen((body) => {
        if (!isRecord(body)) {
          return err(AppError.invalidRequest("Invalid payload"));
        }
        const content = String(body.content ?? "");
        const sha = body.sha ? String(body.sha) : undefined;
        const path = body.path ? String(body.path) : undefined;
        const meta = isRecord(body.meta) ? body.meta : undefined;
        const message =
          body.message && typeof body.message === "string"
            ? body.message
            : `chore: update ${slugPath}`;

        return getContentStore().match(
          (store) =>
            store.upsertDoc({
              path: path ?? `${slugPath}.mdx`,
              content,
              meta,
              sha,
              message,
            }),
          (error) => errAsync(error),
        );
      }),
    )
    .match(
      (result) => NextResponse.json(result),
      jsonError,
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  return requireAdminResult()
    .andThen(() =>
      ResultAsync.fromPromise(
        request.json() as Promise<unknown>,
        () => AppError.invalidRequest("Invalid JSON body"),
      ).andThen((body) => {
        if (!isRecord(body)) {
          return err(AppError.invalidRequest("Invalid payload"));
        }
        const sha = String(body.sha ?? "");
        const path = body.path ? String(body.path) : undefined;
        const message =
          body.message && typeof body.message === "string"
            ? body.message
            : `chore: delete ${slugPath}`;

        return getContentStore().match(
          (store) =>
            store.deleteDoc({
              path: path ?? `${slugPath}.mdx`,
              sha,
              message,
            }),
          (error) => errAsync(error),
        );
      }),
    )
    .match(
      (result) => NextResponse.json(result),
      jsonError,
    );
}
