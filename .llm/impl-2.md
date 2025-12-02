# Implementation Log 2

- Time: 2025-12-02T18:46:35Z
- Base Commit: c52ff5e5adfe9f27bdec68e4b236d5cbc1c53baa
- Head Commit: c52ff5e5adfe9f27bdec68e4b236d5cbc1c53baa

## Tasks Completed in this Cycle (3)
1) Switch to GitHub OAuth auth types and remove TOTP
2) Wire GitHub MDX repo into data layer and components
3) Require and use GITHUB_REPO_ACCESS_TOKEN for GitHub API

## High-level Summary
- Enforced GitHub auth tokens (fine-grained) for all API calls and surfaced configuration via env.
- Hooked the GitHub MDX content store into the data layer; front end now imports from the new API instead of the old WordPress stubs.
- Added example env template for the repo URL and access token.

## Changes Since Last Snapshot
### Commit Summary
```
(no new commits; working tree changes only)
```

### File Changes
```
M	.llm/state.json
M	next.config.ts
M	package.json
M	pnpm-lock.yaml
M	src/app/globals.css
M	src/app/layout.tsx
M	src/app/page.tsx
?? .example.env
?? .llm/impl-1.md
?? example.env
?? src/app/not-found.tsx
?? src/components/
?? src/lib/
```

### Key Patches (Trimmed)
```diff
--- a/src/lib/api/github.ts
+++ b/src/lib/api/github.ts
@@
-    this.token = config.token ?? process.env.GITHUB_TOKEN;
-    this.apiBaseUrl = config.apiBaseUrl ?? "https://api.github.com";
+    this.token =
+      config.token ??
+      process.env.GITHUB_REPO_ACCESS_TOKEN ??
+      process.env.GITHUB_TOKEN;
+    this.apiBaseUrl = config.apiBaseUrl ?? "https://api.github.com";
+
+    if (!this.token) {
+      throw new Error(
+        "GitHub token missing: set GITHUB_REPO_ACCESS_TOKEN (fine-grained) or GITHUB_TOKEN",
+      );
+    }
```

```diff
--- a/src/lib/api.ts
+++ b/src/lib/api.ts
@@
-const repoConfig = parseRepoUrl(process.env.MDX_REPO_URL);
+const repoConfig = parseRepoUrl(process.env.MDX_REPO_URL);
+const repoToken =
+  process.env.GITHUB_REPO_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN;
+
+if (!repoToken) {
+  throw new Error(
+    "GITHUB_REPO_ACCESS_TOKEN (or GITHUB_TOKEN) is required to fetch MDX content from GitHub.",
+  );
+}
+
 const client = new GitHubContentStore({
   owner: repoConfig.owner,
   repo: repoConfig.repo,
   branch: repoConfig.branch,
   docsPath: "content",
+  token: repoToken,
 });
```

```diff
--- /dev/null
+++ b/example.env
@@
+MDX_REPO_URL=
+GITHUB_REPO_ACCESS_TOKEN=
+REVALIDATE_INTERVAL_SECONDS=
```

## Decisions & Rationale
- GraphQL access to GitHub requires auth; enforced use of a fine-grained token via `GITHUB_REPO_ACCESS_TOKEN`, with `GITHUB_TOKEN` as fallback to avoid unauthenticated failures on Vercel.
- The data layer now pulls MDX from GitHub directly, so all WordPress imports were pointed to the new API facade.
- Provided an env template so deployments declare repo URL and token explicitly.

## Risks & Follow-ups
- Token must be present in environments (dev/preview/prod); add to platform secrets and avoid logging.
- Large repos may still need pagination/caching; current GraphQL query assumes manageable tree depth.
- Frontmatter parsing remains minimal; consider `gray-matter` for richer YAML and MDX rendering instead of escaped HTML.

## References
- None beyond repo code.
