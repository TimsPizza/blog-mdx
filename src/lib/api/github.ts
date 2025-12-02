import {
  type ArchiveDocRequest,
  type ArchiveDocResponse,
  type BlogApiClient,
  type DeleteDocRequest,
  type DeleteDocResponse,
  type GetDocResponse,
  type ListDocsRequest,
  type ListDocsResponse,
  type DocStatus,
  type MdxDocument,
  type MdxDocumentMeta,
  type UnarchiveDocRequest,
  type UnarchiveDocResponse,
  type UpsertDocRequest,
  type UpsertDocResponse,
} from "./types";

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  docsPath?: string;
  token?: string;
  apiBaseUrl?: string;
}

type GraphQLTreeEntry = {
  name: string;
  type: "blob" | "tree";
  object?: GraphQLTreeObject | null;
};

type GraphQLTreeObject =
  | {
      __typename: "Blob";
      text: string | null;
      oid: string;
    }
  | {
      __typename: "Tree";
      entries: GraphQLTreeEntry[];
    };

type GraphQLTreeResponse = {
  data?: {
    repository?: {
      object?: {
        entries?: GraphQLTreeEntry[];
      } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
};

type GitHubContentResponse = {
  type: "file";
  content: string;
  sha: string;
  encoding: "base64";
};

type GitHubWriteResponse = {
  content: {
    sha: string;
  };
  commit: {
    sha: string;
  };
};

const DEFAULT_DOCS_PATH = "content";

export class GitHubContentStore implements BlogApiClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly docsPath: string;
  private readonly token?: string;
  private readonly apiBaseUrl: string;

  constructor(config: GitHubRepoConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch ?? "main";
    this.docsPath = (config.docsPath ?? DEFAULT_DOCS_PATH)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
    this.token =
      config.token ??
      process.env.GITHUB_REPO_ACCESS_TOKEN ??
      process.env.GITHUB_TOKEN;
    this.apiBaseUrl = config.apiBaseUrl ?? "https://api.github.com";

    if (!this.token) {
      throw new Error(
        "GitHub token missing: set GITHUB_REPO_ACCESS_TOKEN (fine-grained) or GITHUB_TOKEN",
      );
    }
  }

  /**
   * Fetch all documents (meta + content) in a single GraphQL round-trip.
   * This keeps MDX as the single source of truth (no separate metadata index).
   */
  async listDocsWithContent(): Promise<MdxDocument[]> {
    return this.readDocsViaGraphQL();
  }

  async listDocs(req: ListDocsRequest): Promise<ListDocsResponse> {
    const docs = await this.readDocsViaGraphQL();
    const metas = docs.map(deriveMetaFromDoc);

    const filtered = metas
      .filter((meta) => (req.status ? meta.status === req.status : true))
      .filter((meta) => (req.tag ? meta.tags?.includes(req.tag) : true));

    const limit = req.limit ?? 20;
    const cursorIndex = req.cursor ? Number(req.cursor) : 0;
    const paged = filtered.slice(cursorIndex, cursorIndex + limit);
    const nextCursor =
      cursorIndex + limit < filtered.length
        ? String(cursorIndex + limit)
        : undefined;

    return { items: paged, nextCursor };
  }

  async getDoc(slug: string): Promise<GetDocResponse> {
    const contentPath = this.joinPath(this.docsPath, slug, "content.mdx");
    const metaPath = this.joinPath(this.docsPath, slug, "meta.json");

    const { content, sha } = await this.readRepoFile(contentPath);
    let metaObj: Record<string, unknown> = {};
    try {
      const metaFile = await this.readRepoFile(metaPath);
      metaObj = JSON.parse(metaFile.content) as Record<string, unknown>;
    } catch {
      // ignore missing meta
    }

    const doc: MdxDocument = { slug, meta: metaObj, content, sha };
    return { doc };
  }

  async upsertDoc(req: UpsertDocRequest): Promise<UpsertDocResponse> {
    const contentPath = this.joinPath(this.docsPath, req.slug, "content.mdx");
    const metaPath = this.joinPath(this.docsPath, req.slug, "meta.json");

    const contentWrite = await this.writeRepoFile({
      path: contentPath,
      content: req.content,
      message: req.message,
      sha: req.sha,
    });

    await this.writeRepoFile({
      path: metaPath,
      content: JSON.stringify(req.meta ?? {}, null, 2),
      message: req.message,
    });

    return {
      slug: req.slug,
      newSha: contentWrite.contentSha,
      commitSha: contentWrite.commitSha,
    };
  }

  async deleteDoc(req: DeleteDocRequest): Promise<DeleteDocResponse> {
    const docPath = this.joinPath(this.docsPath, req.slug, "content.mdx");
    const deleteCommitSha = await this.deleteRepoFile({
      path: docPath,
      sha: req.sha,
      message: req.message,
    });
    const metaPath = this.joinPath(this.docsPath, req.slug, "meta.json");
    try {
      const meta = await this.readRepoFile(metaPath);
      await this.deleteRepoFile({
        path: metaPath,
        sha: meta.sha,
        message: req.message,
      });
    } catch {
      // ignore missing meta
    }

    return {
      deleted: true,
      commitSha: deleteCommitSha ?? req.sha,
    };
  }

  async archiveDoc(req: ArchiveDocRequest): Promise<ArchiveDocResponse> {
    return this.updateDocStatus({
      slug: req.slug,
      targetStatus: "archived",
      expectedSha: req.expectedSha,
      message: req.message,
    });
  }

  async unarchiveDoc(req: UnarchiveDocRequest): Promise<UnarchiveDocResponse> {
    return this.updateDocStatus({
      slug: req.slug,
      targetStatus: "draft",
      expectedSha: req.expectedSha,
      message: req.message,
    });
  }

  private async updateDocStatus(args: {
    slug: string;
    targetStatus: DocStatus;
    expectedSha?: string;
    message: string;
  }): Promise<ArchiveDocResponse | UnarchiveDocResponse> {
    const metaPath = this.joinPath(this.docsPath, args.slug, "meta.json");
    const metaFile = await this.readRepoFile(metaPath);
    const metaObj = JSON.parse(metaFile.content) as Record<string, unknown>;
    if (args.expectedSha && args.expectedSha !== metaFile.sha) {
      throw new Error(
        `Stale metadata for ${args.slug}: expected ${args.expectedSha}, found ${metaFile.sha}`,
      );
    }
    const nextFrontmatter = { ...metaObj, status: args.targetStatus };
    const writeResult = await this.writeRepoFile({
      path: metaPath,
      content: JSON.stringify(nextFrontmatter, null, 2),
      message: args.message,
      sha: metaFile.sha,
    });
    return { status: args.targetStatus, commitSha: writeResult.commitSha };
  }

  private async readDocsViaGraphQL(): Promise<MdxDocument[]> {
    const expression = `${this.branch}:${this.docsPath}`;
    const query = `
      query ListDocs($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Tree {
              entries {
                name
                type
                object {
                  __typename
                  ... on Blob {
                    text
                    oid
                  }
                  ... on Tree {
                    entries {
                      name
                      type
                      object {
                        __typename
                        ... on Blob {
                          text
                          oid
                        }
                        ... on Tree {
                          entries {
                            name
                            type
                            object {
                              __typename
                              ... on Blob {
                                text
                                oid
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch(`${this.apiBaseUrl}/graphql`, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          owner: this.owner,
          name: this.repo,
          expression,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GraphQL listing failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as GraphQLTreeResponse;
    if (json.errors?.length) {
      const msg = json.errors.map((e) => e.message).join("; ");
      throw new Error(`GraphQL errors: ${msg}`);
    }

    const entries = json.data?.repository?.object?.entries;
    if (!entries) {
      return [];
    }

    const flattened = flattenTree(entries, "");
    return groupBySlug(flattened, this.docsPath);
  }

  private async readRepoFile(
    path: string,
  ): Promise<{ content: string; sha: string }> {
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponentPath(
      path,
    )}?ref=${encodeURIComponent(this.branch)}`;

    const res = await fetch(url, {
      headers: this.buildHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(
        `Failed to read ${path}: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as GitHubContentResponse;
    const buffer = Buffer.from(json.content, json.encoding);
    const content = buffer.toString("utf8");

    return { content, sha: json.sha };
  }

  private async writeRepoFile(args: {
    path: string;
    content: string;
    message: string;
    sha?: string;
  }): Promise<{ contentSha: string; commitSha: string }> {
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponentPath(
      args.path,
    )}`;
    const body = JSON.stringify({
      message: args.message,
      content: Buffer.from(args.content, "utf8").toString("base64"),
      sha: args.sha,
      branch: this.branch,
    });

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to write ${args.path}: ${res.status} ${text}`);
    }

    const json = (await res.json()) as GitHubWriteResponse;
    return {
      contentSha: json.content.sha,
      commitSha: json.commit.sha,
    };
  }

  private async deleteRepoFile(args: {
    path: string;
    sha: string;
    message: string;
  }): Promise<string | undefined> {
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponentPath(
      args.path,
    )}`;
    const body = JSON.stringify({
      message: args.message,
      sha: args.sha,
      branch: this.branch,
    });

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to delete ${args.path}: ${res.status} ${text}`);
    }

    try {
      const json = (await res.json()) as GitHubWriteResponse;
      return json.commit.sha;
    } catch {
      return undefined;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private joinPath(...parts: string[]) {
    return parts
      .filter(Boolean)
      .join("/")
      .replace(/\/{2,}/g, "/")
      .replace(/^\/+/, "");
  }
}

function flattenTree(
  entries: GraphQLTreeEntry[],
  prefix: string,
): Array<{ path: string; text: string | null; sha?: string }> {
  const files: Array<{ path: string; text: string | null; sha?: string }> = [];
  for (const entry of entries) {
    const currentPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!entry.object) continue;
    if (entry.object.__typename === "Blob") {
      files.push({
        path: currentPath,
        text: entry.object.text,
        sha: entry.object.oid,
      });
    } else if (entry.object.__typename === "Tree" && entry.object.entries) {
      files.push(...flattenTree(entry.object.entries, currentPath));
    }
  }
  return files;
}

function groupBySlug(
  entries: Array<{ path: string; text: string | null; sha?: string }>,
  docsPath: string,
): MdxDocument[] {
  const normalizedPrefix = docsPath.replace(/^\/+|\/+$/g, "");
  const prefix = normalizedPrefix ? `${normalizedPrefix}/` : "";
  const buckets = new Map<
    string,
    {
      content?: string | null;
      contentSha?: string;
      meta?: string | null;
      metaSha?: string;
    }
  >();

  for (const entry of entries) {
    if (!entry.path.startsWith(prefix)) continue;
    const rel = entry.path.slice(prefix.length);
    const parts = rel.split("/");
    if (parts.length < 2) continue;
    const slug = parts[0];
    const file = parts.slice(1).join("/");
    const bucket = buckets.get(slug) ?? {};
    if (file === "content.mdx") {
      bucket.content = entry.text;
      bucket.contentSha = entry.sha;
    } else if (file === "meta.json") {
      bucket.meta = entry.text;
      bucket.metaSha = entry.sha;
    }
    buckets.set(slug, bucket);
  }

  const docs: MdxDocument[] = [];
  for (const [slug, bucket] of buckets.entries()) {
    let meta: Record<string, unknown> = {};
    if (bucket.meta) {
      try {
        meta = JSON.parse(bucket.meta) as Record<string, unknown>;
      } catch {
        meta = {};
      }
    }
    const body = bucket.content ?? "";
    docs.push({
      slug,
      meta,
      content: body,
      sha: bucket.contentSha ?? "",
    });
  }
  return docs;
}

function deriveMetaFromDoc(doc: MdxDocument): MdxDocumentMeta {
  const status = normalizeStatus(doc.meta.status) ?? "draft";
  const tags = toStringArray(doc.meta.tags);
  return {
    slug: doc.slug,
    title: typeof doc.meta.title === "string" ? doc.meta.title : undefined,
    summary:
      typeof doc.meta.summary === "string"
        ? doc.meta.summary
        : typeof doc.meta.description === "string"
          ? doc.meta.description
          : undefined,
    tags,
    coverImageId:
      typeof doc.meta.coverImageId === "string"
        ? doc.meta.coverImageId
        : typeof doc.meta.cover === "string"
          ? doc.meta.cover
          : undefined,
    status,
    sha: doc.sha,
    updatedAt:
      typeof doc.meta.updatedAt === "string" ? doc.meta.updatedAt : undefined,
  };
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function normalizeStatus(value: unknown): DocStatus | undefined {
  if (typeof value !== "string") return undefined;
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }
  return undefined;
}

function encodeURIComponentPath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
