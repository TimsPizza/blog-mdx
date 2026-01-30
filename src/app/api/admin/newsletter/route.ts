import { sendQueuedNewsletter } from "@/lib/server/newsletter";
import { requireAdminResult } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";
import { AppError } from "@/types/error";
import { errAsync } from "neverthrow";
import { NextResponse } from "next/server";

export async function POST() {
  const result = requireAdminResult().andThen(() =>
    sendQueuedNewsletter().orElse((error) => {
      console.error("[api/admin/newsletter]", {
        code: error.code,
        message: error.message,
        tag: error.tag,
        status: error.status,
      });
      return errAsync(error);
    }),
  );

  return result.match(
    (data) => NextResponse.json({ ok: true, data }),
    (error: AppError) => jsonError(error),
  );
}
