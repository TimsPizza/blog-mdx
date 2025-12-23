import { NextResponse, type NextRequest } from "next/server";

const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

type Counter = { count: number; expiresAt: number };
const rateLimitStore = new Map<string, Counter>();

const PROTECTED_PATHS = [/^\/api\/admin(\/|$)/, /^\/api\/articles(\/|$)/];
const ADMIN_PATH = /^\/admin(\/|$)/;

export function proxy(req: NextRequest) {
  const urlPath = req.nextUrl.pathname;
  if (ADMIN_PATH.test(urlPath)) {
    const requestPath = `${urlPath}${req.nextUrl.search}`;
    if (!hasSession(req)) {
      const signInUrl = req.nextUrl.clone();
      signInUrl.pathname = "/api/auth/signin";
      signInUrl.searchParams.set("callbackUrl", requestPath);
      return NextResponse.redirect(signInUrl);
    }
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-request-path", requestPath);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const ip = getClientIp(req);
  if (ip) {
    const limited = checkRateLimit(ip);
    if (limited) {
      return NextResponse.json(
        { error: "Too Many Requests" },
        {
          status: 429,
          headers: {
            "Retry-After": limited.retryAfter.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
  }

  const needsAuth =
    PROTECTED_PATHS.some((re) => re.test(urlPath)) && req.method !== "GET";

  if (needsAuth && !hasSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

function checkRateLimit(key: string): { retryAfter: number } | null {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return null;
  }
  if (existing.count >= RATE_LIMIT_REQUESTS) {
    const retryAfterSeconds = Math.ceil((existing.expiresAt - now) / 1000);
    return { retryAfter: retryAfterSeconds };
  }
  existing.count += 1;
  return null;
}

function hasSession(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");
  if (auth && auth.startsWith("Bearer ")) return true;
  const legacy = req.cookies.get("session_token");
  if (legacy?.value) return true;
  const sessionToken =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-next-auth.session-token")?.value ??
    req.cookies.get("__Host-next-auth.session-token")?.value ??
    readCookie(cookieHeader, "next-auth.session-token") ??
    readCookie(cookieHeader, "__Secure-next-auth.session-token") ??
    readCookie(cookieHeader, "__Host-next-auth.session-token");
  return !!sessionToken;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const target = `${name}=`;
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return trimmed.slice(target.length);
    }
  }
  return null;
}

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
