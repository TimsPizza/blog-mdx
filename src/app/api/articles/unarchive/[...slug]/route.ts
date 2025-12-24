import { getContentStore } from "@/lib/server/content-store";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";
import { AppError } from "@/types/error";
import { err, errAsync, ResultAsync } from "neverthrow";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
        const expectedSha = body.sha ? String(body.sha) : undefined;
        const path = body.path ? String(body.path) : undefined;
        const message =
          body.message && typeof body.message === "string"
            ? body.message
            : `chore: unarchive ${slugPath}`;

        return getContentStore().match(
          (store) =>
            store.unarchiveDoc({
              path: path ?? `${slugPath}.mdx`,
              expectedSha,
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
