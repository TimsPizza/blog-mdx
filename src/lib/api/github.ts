import {
  type ArchiveDocRequest,
  type ArchiveDocResponse,
  type DeleteDocRequest,
  type DeleteDocResponse,
  type MdxDocument,
  type MdxDocumentMeta,
  type UnarchiveDocRequest,
  type UpsertDocRequest,
  type UpsertDocResponse,
} from "@/lib/api/types";
import { AppError } from "@/types/error";
import { Octokit } from "octokit";
import { err, ok, okAsync, ResultAsync } from "neverthrow";

type GitHubContentStoreConfig = {
  owner: string;
  repo: string;
  branch?: string;
  docsPath?: string;
  token: string;
};

type GitHubFileEntry = {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
};

type ParsedFrontmatter = {
  meta: Record<string, unknown>;
  body: string;
};

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

function parseFrontmatter(source: string): ParsedFrontmatter {
  if (!source.startsWith("---")) {
    return { meta: {}, body: source };
  }
  const match = source.match(FRONTMATTER_REGEX);
  if (!match) {
    return { meta: {}, body: source };
  }
  const raw = match[1] ?? "";
  const body = source.slice(match[0].length);
  return { meta: parseYamlMetadata(raw), body };
}

function parseYamlMetadata(raw: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split(":");
    if (!key) continue;
    const value = rest.join(":").trim();
    if (!value) {
      meta[key] = "";
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      meta[key] = inner
        ? inner
            .split(",")
            .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        : [];
      continue;
    }
    if (value === "true" || value === "false") {
      meta[key] = value === "true";
      continue;
    }
    const num = Number(value);
    if (!Number.isNaN(num) && value !== "") {
      meta[key] = num;
      continue;
    }
    meta[key] = value.replace(/^["']|["']$/g, "");
  }
  return meta;
}

function serializeFrontmatter(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) return "";
  const lines = entries.map(([key, value]) => {
    if (Array.isArray(value)) {
      const items = value
        .map((item) => JSON.stringify(String(item)))
        .join(", ");
      return `${key}: [${items}]`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return `${key}: ${String(value)}`;
    }
    if (value === null) {
      return `${key}: null`;
    }
    return `${key}: ${JSON.stringify(String(value))}`;
  });
  return `---\n${lines.join("\n")}\n---\n\n`;
}

function applyFrontmatter(
  content: string,
  meta?: Record<string, unknown>,
): string {
  if (!meta || Object.keys(meta).length === 0) return content;
  const { body } = parseFrontmatter(content);
  return `${serializeFrontmatter(meta)}${body}`;
}

function normalizeMeta(
  meta: Record<string, unknown>,
  path: string,
): MdxDocumentMeta {
  const uid = stringValue(meta.uid) ?? path.replace(/\.mdx?$/i, "");
  const statusRaw = stringValue(meta.status);
  const inferredStatus = path.startsWith("archived/") ? "archived" : "draft";
  const status =
    statusRaw === "published" ||
    statusRaw === "archived" ||
    statusRaw === "draft"
      ? statusRaw
      : inferredStatus;
  return {
    uid,
    status,
    title: stringValue(meta.title),
    summary: stringValue(meta.summary),
    tags: toStringArray(meta.tags),
    coverImageUrl: stringValue(meta.coverImageUrl),
    createdAt: numberValue(meta.createdAt),
    updatedAt: numberValue(meta.updatedAt),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof value === "string") {
    const arr = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}

function ensureMdxExtension(path: string): string {
  return path.endsWith(".mdx") ? path : `${path}.mdx`;
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

type GitHubErrorLike = {
  status?: number;
  response?: { status?: number };
};

function getGitHubStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as GitHubErrorLike;
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.response?.status === "number") {
    return candidate.response.status;
  }
  return undefined;
}

function mapGitHubError(error: unknown, message: string): AppError {
  const status = getGitHubStatus(error);
  if (status === 404) return AppError.notFound(message);
  if (status === 409) return AppError.conflict(message);
  if (status === 401) return AppError.unauthorized(message);
  return AppError.fromUnknown(error, { tag: "FETCH", message });
}

export class GitHubContentStore {
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch?: string;
  private readonly docsPath: string;
  private readonly octokit: Octokit;

  constructor(config: GitHubContentStoreConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch;
    this.docsPath = normalizePath(config.docsPath ?? "");
    this.octokit = new Octokit({ auth: config.token });
  }

  listAllCategories(): ResultAsync<string[], AppError> {
    return this.listDirectory(this.docsPath).map((entries) =>
      entries
        .filter((entry) => entry.type === "dir")
        .map((entry) => entry.name),
    );
  }

  listDocsByCategory(category: string): ResultAsync<MdxDocument[], AppError> {
    const categoryPath = this.joinPath(this.docsPath, category);
    return this.listDirectory(categoryPath).andThen((entries) => {
      const mdxFiles = entries.filter(
        (entry) => entry.type === "file" && entry.name.endsWith(".mdx"),
      );
      return ResultAsync.combine(
        mdxFiles.map((entry) => this.getDoc(entry.path)),
      );
    });
  }

  listDocsWithContent(): ResultAsync<MdxDocument[], AppError> {
    return this.listAllCategories().andThen((categories) =>
      ResultAsync.combine(
        categories.map((category) => this.listDocsByCategory(category)),
      ).map((batches) => batches.flat()),
    );
  }

  getDoc(pathToMdxFile: string): ResultAsync<MdxDocument, AppError> {
    const resolvedPath = this.resolveDocPath(pathToMdxFile);
    return this.readFile(resolvedPath).map((file) => {
      const { meta, body } = parseFrontmatter(file.content);
      const docPath = this.toDocPath(resolvedPath);
      return {
        path: docPath,
        content: body,
        meta: normalizeMeta(meta, docPath),
        sha: file.sha,
      };
    });
  }

  upsertDoc(
    pathOrRequest: string | UpsertDocRequest,
    mdxFileJson?: {
      content: string;
      meta?: Record<string, unknown>;
      sha?: string;
      message?: string;
    },
  ): ResultAsync<UpsertDocResponse, AppError> {
    const request =
      typeof pathOrRequest === "string"
        ? {
            path: pathOrRequest,
            content: mdxFileJson?.content ?? "",
            meta: mdxFileJson?.meta,
            sha: mdxFileJson?.sha,
            message: mdxFileJson?.message ?? `chore: update ${pathOrRequest}`,
          }
        : pathOrRequest;
    const resolvedPath = this.resolveDocPath(request.path);
    const message =
      request.message ?? `chore: update ${this.toDocPath(resolvedPath)}`;
    const nextContent = applyFrontmatter(request.content, request.meta);
    return this.writeFile({
      path: resolvedPath,
      content: nextContent,
      sha: request.sha,
      message,
    }).map((result) => ({
      path: this.toDocPath(resolvedPath),
      newSha: result.contentSha,
      commitSha: result.commitSha,
    }));
  }

  changeDocCategory(
    pathToMdxFile: string,
    newCategory: string,
  ): ResultAsync<{ path: string; commitSha: string }, AppError> {
    const resolvedPath = this.resolveDocPath(pathToMdxFile);
    const baseName = resolvedPath.split("/").pop() ?? resolvedPath;
    const newPath = this.joinPath(this.docsPath, newCategory, baseName);
    return this.moveDocInternal(resolvedPath, newPath, {
      message: `chore: move ${this.toDocPath(resolvedPath)} to ${newCategory}`,
    }).map((result) => ({
      path: this.toDocPath(newPath),
      commitSha: result.commitSha,
    }));
  }

  archiveDoc(
    pathOrRequest: string | ArchiveDocRequest,
  ): ResultAsync<ArchiveDocResponse, AppError> {
    const request =
      typeof pathOrRequest === "string"
        ? { path: pathOrRequest, message: `chore: archive ${pathOrRequest}` }
        : pathOrRequest;
    const resolvedPath = this.resolveDocPath(request.path);
    const checkSha: ResultAsync<
      { content: string; sha: string } | null,
      AppError
    > = request.expectedSha
      ? this.readFile(resolvedPath)
          .andThen((current) => {
            if (current.sha !== request.expectedSha) {
              return err(
                AppError.conflict(`Archive conflict for ${request.path}`),
              );
            }
            return ok(current);
          })
          .map((current) => current as { content: string; sha: string } | null)
      : okAsync<{ content: string; sha: string } | null, AppError>(null);

    return checkSha.andThen(() => {
      const baseName = resolvedPath.split("/").pop() ?? resolvedPath;
      const archivedPath = this.joinPath(this.docsPath, "archived", baseName);
      return this.moveDocInternal(resolvedPath, archivedPath, {
        message:
          request.message ?? `chore: archive ${this.toDocPath(resolvedPath)}`,
        transform: (content) => {
          const { meta, body } = parseFrontmatter(content);
          const nextMeta = { ...meta, status: "archived" };
          return applyFrontmatter(body, nextMeta);
        },
      }).map((moveResult) => ({
        status: "archived" as const,
        commitSha: moveResult.commitSha,
      }));
    });
  }

  unarchiveDoc(
    pathOrRequest: string | UnarchiveDocRequest,
  ): ResultAsync<ArchiveDocResponse, AppError> {
    const request =
      typeof pathOrRequest === "string"
        ? { path: pathOrRequest, message: `chore: unarchive ${pathOrRequest}` }
        : pathOrRequest;
    const resolvedPath = this.resolveDocPath(request.path);
    const checkSha: ResultAsync<
      { content: string; sha: string } | null,
      AppError
    > = request.expectedSha
      ? this.readFile(resolvedPath)
          .andThen((current) => {
            if (current.sha !== request.expectedSha) {
              return err(
                AppError.conflict(`Unarchive conflict for ${request.path}`),
              );
            }
            return ok(current);
          })
          .map((current) => current as { content: string; sha: string } | null)
      : okAsync<{ content: string; sha: string } | null, AppError>(null);

    return checkSha.andThen(() => {
      const baseName = resolvedPath.split("/").pop() ?? resolvedPath;
      return this.readFile(resolvedPath).andThen((existing) => {
        const { meta } = parseFrontmatter(existing.content);
        const category =
          typeof meta.category === "string" && meta.category.trim()
            ? meta.category.trim()
            : "drafts";
        const nextPath = this.joinPath(this.docsPath, category, baseName);
        return this.moveDocInternal(resolvedPath, nextPath, {
          message:
            request.message ??
            `chore: unarchive ${this.toDocPath(resolvedPath)}`,
          transform: (content) => {
            const { meta: currentMeta, body } = parseFrontmatter(content);
            const nextMeta = { ...currentMeta, status: "draft" };
            return applyFrontmatter(body, nextMeta);
          },
        }).map((moveResult) => ({
          status: "draft" as const,
          commitSha: moveResult.commitSha,
        }));
      });
    });
  }

  deleteDoc(
    pathOrRequest: string | DeleteDocRequest,
  ): ResultAsync<DeleteDocResponse, AppError> {
    const request =
      typeof pathOrRequest === "string"
        ? {
            path: pathOrRequest,
            sha: "",
            message: `chore: delete ${pathOrRequest}`,
          }
        : pathOrRequest;
    const resolvedPath = this.resolveDocPath(request.path);
    const resolveSha = request.sha
      ? okAsync<string, AppError>(request.sha)
      : this.readFile(resolvedPath).map((file) => file.sha);
    return resolveSha.andThen((sha) =>
      this.deleteFile({
        path: resolvedPath,
        sha,
        message:
          request.message ?? `chore: delete ${this.toDocPath(resolvedPath)}`,
      }).map((result) => ({
        deleted: true as const,
        commitSha: result.commitSha,
      })),
    );
  }

  moveDoc(
    oldPath: string,
    newPath: string,
  ): ResultAsync<{ commitSha: string }, AppError> {
    return this.moveDocInternal(
      this.resolveDocPath(oldPath),
      this.resolveDocPath(newPath),
      {
        message: `chore: move ${oldPath} to ${newPath}`,
      },
    );
  }

  private moveDocInternal(
    oldPath: string,
    newPath: string,
    options: {
      message: string;
      transform?: (content: string) => string;
    },
  ): ResultAsync<{ commitSha: string }, AppError> {
    return this.readFile(oldPath).andThen((file) => {
      const nextContent = options.transform
        ? options.transform(file.content)
        : file.content;
      return this.writeFile({
        path: newPath,
        content: nextContent,
        message: options.message,
      }).andThen((createResult) =>
        this.deleteFile({
          path: oldPath,
          sha: file.sha,
          message: options.message,
        }).map(() => ({ commitSha: createResult.commitSha })),
      );
    });
  }

  private resolveDocPath(pathToMdxFile: string): string {
    const normalized = normalizePath(pathToMdxFile);
    const withExt = ensureMdxExtension(normalized);
    if (!this.docsPath) return withExt;
    if (withExt.startsWith(`${this.docsPath}/`)) return withExt;
    return this.joinPath(this.docsPath, withExt);
  }

  private toDocPath(fullPath: string): string {
    if (!this.docsPath) return normalizePath(fullPath);
    const prefix = `${this.docsPath}/`;
    return fullPath.startsWith(prefix)
      ? fullPath.slice(prefix.length)
      : fullPath;
  }

  private joinPath(...segments: string[]): string {
    return segments
      .filter((segment) => segment && segment.trim())
      .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
      .join("/");
  }

  private request<T>(
    promise: Promise<T>,
    message: string,
  ): ResultAsync<T, AppError> {
    return ResultAsync.fromPromise(promise, (error) =>
      mapGitHubError(error, message),
    );
  }

  private listDirectory(path: string): ResultAsync<GitHubFileEntry[], AppError> {
    const normalized = normalizePath(path);
    return this.request(
      this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: normalized || "",
        ref: this.branch,
      }),
      `Failed to list ${normalized || "root"}`,
    ).map((response) => {
      if (Array.isArray(response.data)) {
        return response.data
          .filter((entry) => entry.type === "file" || entry.type === "dir")
          .map((entry) => ({
            name: entry.name,
            path: entry.path,
            sha: entry.sha,
            type: entry.type as "file" | "dir",
          }));
      }
      return [];
    });
  }

  private readFile(
    path: string,
  ): ResultAsync<{ content: string; sha: string }, AppError> {
    return this.request(
      this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      }),
      `Failed to read ${path}`,
    ).andThen((response) => {
      if (Array.isArray(response.data) || response.data.type !== "file") {
        return err(AppError.notFound(`Expected file at ${path}`));
      }
      const sha = response.data.sha;
      const content = response.data.content
        ? Buffer.from(response.data.content, "base64").toString("utf8")
        : "";
      return ok({ content, sha });
    });
  }

  private writeFile(args: {
    path: string;
    content: string;
    message: string;
    sha?: string;
  }): ResultAsync<{ contentSha: string; commitSha: string }, AppError> {
    return this.request(
      this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: args.path,
        message: args.message,
        content: Buffer.from(args.content, "utf8").toString("base64"),
        sha: args.sha,
        branch: this.branch,
      }),
      `Failed to write ${args.path}`,
    ).andThen((response) => {
      if (!response.data.content?.sha || !response.data.commit?.sha) {
        return err(
          new AppError({
            code: "INTERNAL",
            message: `Failed to write ${args.path}`,
            tag: "FETCH",
            expose: false,
          }),
        );
      }
      return ok({
        contentSha: response.data.content.sha,
        commitSha: response.data.commit.sha,
      });
    });
  }

  private deleteFile(args: {
    path: string;
    sha: string;
    message: string;
  }): ResultAsync<{ commitSha: string }, AppError> {
    return this.request(
      this.octokit.rest.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path: args.path,
        message: args.message,
        sha: args.sha,
        branch: this.branch,
      }),
      `Failed to delete ${args.path}`,
    ).andThen((response) => {
      if (!response.data.commit?.sha) {
        return err(
          new AppError({
            code: "INTERNAL",
            message: `Failed to delete ${args.path}`,
            tag: "FETCH",
            expose: false,
          }),
        );
      }
      return ok({ commitSha: response.data.commit.sha });
    });
  }

}
