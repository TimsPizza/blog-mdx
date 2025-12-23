import { requireAdminResult } from "@/lib/server/admin-auth";
import { getContentStore } from "@/lib/server/content-store";
import { jsonError } from "@/lib/server/http";
import { AppError } from "@/types/error";
import { err, errAsync, ResultAsync } from "neverthrow";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return requireAdminResult()
    .andThen(() =>
      ResultAsync.fromPromise(
        request.json() as Promise<unknown>,
        () => AppError.invalidRequest("Invalid JSON body"),
      ).andThen((body) => {
        if (!isRecord(body)) {
          return err(AppError.invalidRequest("Invalid payload"));
        }
        const fromPath =
          typeof body.fromPath === "string" ? body.fromPath : "";
        const toPath = typeof body.toPath === "string" ? body.toPath : "";
        if (!fromPath || !toPath) {
          return err(
            AppError.invalidRequest("fromPath and toPath are required."),
          );
        }

        return getContentStore().match(
          (store) => store.moveDoc(fromPath, toPath),
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
