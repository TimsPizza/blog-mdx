import { createDrizzleFromEnv } from "@/lib/db/d1";
import { sessions } from "@/lib/db/schema";
import { AppError } from "@/types/error";
import { eq } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function requireAdminSession() {
  const allowed = process.env.GITHUB_PROFILE_ID;
  if (!allowed) return null;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const sessionToken =
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value ??
    cookieStore.get("__Host-next-auth.session-token")?.value;
  if (sessionToken) {
    const db = createDrizzleFromEnv();
    if (db) {
      const row = await db
        .select()
        .from(sessions)
        .where(eq(sessions.session_token, sessionToken))
        .get();
      if (row) {
        const expires =
          row.expires instanceof Date
            ? row.expires.getTime()
            : Number(row.expires);
        if (!Number.isFinite(expires) || expires < Date.now()) return null;
        if (row.user_id !== String(allowed)) return null;
        return {
          user: { id: String(allowed) },
          expires: new Date(expires).toISOString(),
        };
      }
    }
  }

  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const tokenHeaders = new Headers(headerStore);
  if (cookieHeader) {
    tokenHeaders.set("cookie", cookieHeader);
  }
  const tokenRequest = new NextRequest("http://localhost", {
    headers: tokenHeaders,
  });
  const token = await getToken({ req: tokenRequest });
  if (!token) return null;
  const tokenSub = typeof token.sub === "string" ? token.sub : "";
  if (tokenSub !== String(allowed)) return null;
  const tokenExp =
    typeof token.exp === "number" ? token.exp : Number(token.exp);
  const expiresMs = Number.isFinite(tokenExp)
    ? tokenExp * 1000
    : Date.now();
  return {
    user: { id: String(allowed) },
    expires: new Date(expiresMs).toISOString(),
  };
}

export function requireAdminResult(): ResultAsync<
  { user: { id: string }; expires: string },
  AppError
> {
  const allowed = process.env.GITHUB_PROFILE_ID;
  if (!allowed) {
    return errAsync(
      new AppError({
        code: "INTERNAL",
        message: "GITHUB_PROFILE_ID is required.",
        tag: "ENV",
        expose: false,
      }),
    );
  }
  return ResultAsync.fromPromise(
    requireAdminSession(),
    (error) =>
      AppError.fromUnknown(error, {
        tag: "AUTH",
        message: "Admin session lookup failed",
      }),
  ).andThen((session) => {
    if (!session) return errAsync(AppError.unauthorized());
    return okAsync(session);
  });
}

export async function requireAdminOrRedirect(returnTo = "/admin") {
  const sessionResult = await requireAdminResult();
  if (sessionResult.isErr()) {
    const requestPath = (await headers()).get("x-request-path");
    const targetPath =
      requestPath && requestPath.startsWith("/") ? requestPath : returnTo;

    const signInUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(
      targetPath,
    )}`;
    redirect(signInUrl);
  }
  return sessionResult.value;
}

export async function requireAdminJson() {
  const sessionResult = await requireAdminResult();
  return sessionResult.match(
    () => null,
    (error) =>
      NextResponse.json(
        { error: error.publicPayload() },
        { status: error.status },
      ),
  );
}
