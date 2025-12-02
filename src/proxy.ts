import { NextResponse, type NextRequest } from "next/server";

const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

type Counter = { count: number; expiresAt: number };
const rateLimitStore = new Map<string, Counter>();

const PROTECTED_PATHS = [/^\/api\/admin(\/|$)/, /^\/api\/articles(\/|$)/];

export function proxy(req: NextRequest) {
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

  const urlPath = req.nextUrl.pathname;
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
  if (auth && auth.startsWith("Bearer ")) return true;
  const cookie = req.cookies.get("session_token");
  return !!cookie?.value;
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
  matcher: ["/api/:path*"],
};
