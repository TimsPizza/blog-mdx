# Implementation Log 1

- Time: 2025-12-02T18:28:19Z
- Base Commit: N/A
- Head Commit: c52ff5e5adfe9f27bdec68e4b236d5cbc1c53baa

## Tasks Completed in this Cycle (3)
1) Tailwind theme tokens for globals
2) GitHub-backed API types and skeleton
3) GraphQL-driven listing and no metadata file

## High-level Summary
- Defined a lean API contract for MDX docs/media/admin, keeping status/tags in frontmatter and removing the JSON metadata file idea.
- Implemented a GitHub content store: list via GraphQL tree fetch + frontmatter parsing, CRUD via contents API, archive/unarchive by rewriting frontmatter status.
- Stubbed admin TOTP hooks for later; kept parsing/serialization dependency-free for now.

## Changes Since Last Snapshot
### Commit Summary
```
c52ff5e first
e24736d first commit
1120179 first commit
```

### File Changes
```
A src/lib/api/types.ts
A src/lib/api/github.ts
M .llm/state.json
```

### Key Patches (Trimmed)
```diff
--- /dev/null
+++ b/src/lib/api/types.ts
@@
+export type DocStatus = "draft" | "published" | "archived";
+export interface MdxDocument { slug: string; frontmatter: Record<string, unknown>; body: string; sha: string; }
+export interface MdxDocumentMeta { slug: string; title?: string; summary?: string; tags?: string[]; coverImageId?: string; status: DocStatus; sha: string; updatedAt?: string; }
+export type MediaKind = "image" | "video" | "audio" | "binary";
+export interface MediaReference { id: string; kind: MediaKind; url: string; thumbnailUrl?: string; contentType?: string; sizeBytes?: number; availability?: "available" | "unknown" | "broken"; meta?: Record<string, unknown>; }
+export interface UpsertDocRequest { slug: string; content: string; sha?: string; message: string; }
+export interface ArchiveDocRequest { slug: string; expectedSha?: string; message: string; }
+export interface UnarchiveDocRequest { slug: string; expectedSha?: string; message: string; }
+export interface BlogApiClient { listDocs(req: ListDocsRequest): Promise<ListDocsResponse>; getDoc(slug: string): Promise<GetDocResponse>; upsertDoc(req: UpsertDocRequest): Promise<UpsertDocResponse>; deleteDoc(req: DeleteDocRequest): Promise<DeleteDocResponse>; archiveDoc(req: ArchiveDocRequest): Promise<ArchiveDocResponse>; unarchiveDoc(req: UnarchiveDocRequest): Promise<UnarchiveDocResponse>; }
```

```diff
--- /dev/null
+++ b/src/lib/api/github.ts
@@
+export class GitHubContentStore implements BlogApiClient {
+  async listDocs(req: ListDocsRequest): Promise<ListDocsResponse> {
+    const docs = await this.readDocsViaGraphQL();
+    const metas = docs.map(deriveMetaFromDoc);
+    const filtered = metas
+      .filter((meta) => (req.status ? meta.status === req.status : true))
+      .filter((meta) => (req.tag ? meta.tags?.includes(req.tag) : true));
+    ...
+  }
+  async archiveDoc(req: ArchiveDocRequest): Promise<ArchiveDocResponse> {
+    return this.updateDocStatus({ slug: req.slug, targetStatus: "archived", expectedSha: req.expectedSha, message: req.message });
+  }
+  private async readDocsViaGraphQL(): Promise<MdxDocument[]> {
+    const expression = `${this.branch}:${this.docsPath}`;
+    const query = `query ListDocs(...) { repository(...) { object(expression: $expression) { ... on Tree { entries { name type object { ... on Blob { text oid } ... } } } } } }`;
+    ...
+    return flattened
+      .filter((entry) => entry.path.endsWith(".mdx"))
+      .map(({ path, text, sha }) => { const { frontmatter, body } = splitFrontmatter(text ?? ""); return { slug: path, frontmatter, body, sha: sha ?? "" }; });
+  }
+}
+function stringifyFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
+  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${serializeValue(value)}`);
+  return `---\n${lines.join("\n")}\n---${body.startsWith("\n") ? body : `\n${body}`}`;
+}
```

## Decisions & Rationale
- Dropped the metadata index file to avoid divergence; listing now scans the repo directly via GitHub GraphQL and parses frontmatter so the MDX stays the single source of truth.
- Kept CRUD on contents API for simplicity and optimistic locking via blob SHA; archive/unarchive mutate `status` in frontmatter instead of external state.
- Left admin TOTP unimplemented pending auth choice (GitHub OAuth vs. TOTP).

## Risks & Follow-ups
- GraphQL tree query depth is fixed; deeply nested content would require an adjusted query or incremental fetch.
- Frontmatter parser/serializer is minimal (no full YAML); replace with `gray-matter` for complex shapes.
- Large repos may need caching (e.g., KV) or pagination via GraphQL if MDX count grows significantly.

## References
- None (new API layer authored here).
