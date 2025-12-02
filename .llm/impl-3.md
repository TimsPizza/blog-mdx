# Implementation Log 3

- Time: 2025-12-02T21:26:11Z
- Base Commit: c52ff5e5adfe9f27bdec68e4b236d5cbc1c53baa
- Head Commit: c52ff5e5adfe9f27bdec68e4b236d5cbc1c53baa

## Tasks Completed in this Cycle (3)
1) Remove gsap/react-icons deps; switch to motion/lucide and fix lint/type-check
2) Design API routes, hook GitHub MDX store, and add Cloudflare D1 metrics client
3) Add middleware with rate limit and auth gate

## High-level Summary
- Hardened API layer with GitHub MDX-backed content, Cloudflare D1 repositories for views/sessions/visits/logs, and OAuth endpoints for GitHub login.
- Added rate-limit/auth middleware for API routes; protected non-GET article routes and admin endpoints.
- Replaced external animation/icon deps with motion/lucide, keeping the build clean and lint/type-check passing.

## Changes Since Last Snapshot
### Commit Summary
```
(no new commits; working tree changes only)
```

### File Changes
```
A middleware.ts
A src/app/api/admin/oauth/callback/route.ts
A src/app/api/admin/oauth/start/route.ts
A src/app/api/admin/session/refresh/route.ts
A src/app/api/articles/[slug]/archive/route.ts
A src/app/api/articles/[slug]/route.ts
A src/app/api/articles/[slug]/unarchive/route.ts
A src/app/api/articles/route.ts
A src/app/api/categories/route.ts
A src/app/api/health/route.ts
A src/app/admin/article/page.tsx
A src/app/admin/category/page.tsx
A src/lib/db/d1.ts
A src/lib/server/categories.ts
A src/lib/server/content-store.ts
A src/lib/server/oauth.ts
A src/lib/server/posts.ts
M src/app/globals.css
M example.env
M .llm/state.json
```

### Key Patches (Trimmed)
```diff
--- /dev/null
+++ b/middleware.ts
@@
 const RATE_LIMIT_REQUESTS = 100;
 const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
 const PROTECTED_PATHS = [/^\\/api\\/admin(\\/|$)/, /^\\/api\\/articles(\\/|$)/];
 export function middleware(req: NextRequest) { ... checkRateLimit ... needsAuth && !hasSession -> 401 ... }
 export const config = { matcher: ["/api/:path*"] };
```

```diff
--- /dev/null
+++ b/src/lib/db/d1.ts
@@
 export class SessionsRepository { /* createSession, findByRefreshToken */ }
 export class VisitsRepository { /* recordVisit */ }
 export class LogsRepository { /* write logs */ }
 export function createD1ClientFromEnv() { ... }
```

```diff
--- /dev/null
+++ b/src/lib/server/oauth.ts
@@
 export function buildGitHubAuthUrl(state) { ... optional redirect_uri ... }
 export async function exchangeCodeForToken(...) { ... }
 export async function getGitHubUser(...) { ... }
 export async function issueSession(...) { /* uses D1 SessionsRepository */ }
 export async function refreshSession(...) { ... }
 export function validateState(req, state) { ... }
```

```diff
--- /dev/null
+++ b/src/app/api/articles/[slug]/route.ts
@@
 export async function GET(... { params: Promise<{ slug: string }> }) { mapDocToPost; viewsRepo.increment(slug); }
 export async function PUT(...) { upsertDoc with sha/message; }
 export async function DELETE(...) { deleteDoc with sha/message; }
```

```diff
--- /dev/null
+++ b/src/app/api/articles/[slug]/archive/route.ts
@@
 POST -> client.archiveDoc({ slug: "${slug}.mdx", expectedSha, message })
```

```diff
--- /dev/null
+++ b/src/app/api/admin/oauth/start/route.ts
@@
 const state = crypto.randomUUID();
 const authUrl = buildGitHubAuthUrl(state);
 const res = NextResponse.json({ authUrl, state });
 applyStateCookie(res, state);
 return res;
```

```diff
--- /dev/null
+++ b/src/app/api/admin/oauth/callback/route.ts
@@
 validateState; exchange code->token; get GitHub user; issue session; return { session, user }
```

## Decisions & Rationale
- Middleware protects admin and mutating article routes while applying a simple IP-based rate limit; keeps auth lightweight (presence check) with full validation in handlers.
- GitHub OAuth endpoints now operational; redirect_uri is optional to allow GitHub app default if not set.
- Cloudflare D1 is the backing store for sessions, views, visits, and logs to support metrics/auditing.

## Risks & Follow-ups
- Middleware rate limiting is in-memory and per-instance; for production, replace with a shared store (D1/Redis/KV).
- OAuth flow still needs frontend wiring and secure token handling (httpOnly cookies, encryption if desired).
- D1 tables must be created manually (views, sessions, visits, logs schemas).
- Admin UI is placeholder; protected routes rely only on token presence—add verification and role checks.

## References
- None beyond current code changes.
