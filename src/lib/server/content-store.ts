import { GitHubContentStore } from "@/lib/api/github";
import { type MdxDocument } from "@/lib/api/types";
import { AppError } from "@/types/error";
import { err, errAsync, ok, type Result, ResultAsync } from "neverthrow";

type RepoConfig = {
  owner: string;
  repo: string;
  branch?: string;
};

function parseRepoUrl(url: string | undefined): Result<RepoConfig, AppError> {
  if (!url) {
    return err(
      new AppError({
        code: "INTERNAL",
        message: "MDX_REPO_URL environment variable is required.",
        tag: "ENV",
        expose: false,
      }),
    );
  }
  const trimmed = url.trim();
  const match = trimmed.match(
    /github\.com[:/]+([^/]+)\/([^/#?]+)(?:[#?](.*))?/i,
  );
  if (!match) {
    return err(
      new AppError({
        code: "INTERNAL",
        message: `MDX_REPO_URL is not a valid GitHub repository URL: ${url}`,
        tag: "ENV",
        expose: false,
      }),
    );
  }
  const owner = match[1];
  const repo = match[2];
  const rest = match[3];
  const branch = rest ? rest.replace(/^ref=|^#/, "") : undefined;
  return ok({
    owner,
    repo: repo.replace(/\.git$/, ""),
    branch,
  });
}

let cachedStore: GitHubContentStore | null = null;

export function getContentStore(): Result<GitHubContentStore, AppError> {
  if (cachedStore) return ok(cachedStore);
  return parseRepoUrl(process.env.MDX_REPO_URL).andThen((repoConfig) => {
    const token =
      process.env.GITHUB_REPO_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN;
    if (!token) {
      return err(
        new AppError({
          code: "INTERNAL",
          message:
            "GITHUB_REPO_ACCESS_TOKEN or GITHUB_TOKEN environment variable is required.",
          tag: "ENV",
          expose: false,
        }),
      );
    }
    cachedStore = new GitHubContentStore({
      owner: repoConfig.owner,
      repo: repoConfig.repo,
      branch: repoConfig.branch,
      docsPath: "content",
      token,
    });
    return ok(cachedStore);
  });
}

export function listDocuments(): ResultAsync<MdxDocument[], AppError> {
  return getContentStore().match(
    (store) => store.listDocsWithContent(),
    (error) => errAsync(error),
  );
}

export function listAllCategories(): ResultAsync<string[], AppError> {
  return getContentStore().match(
    (store) => store.listAllCategories(),
    (error) => errAsync(error),
  );
}

export function listDocsByCategory(
  category: string,
): ResultAsync<MdxDocument[], AppError> {
  return getContentStore().match(
    (store) => store.listDocsByCategory(category),
    (error) => errAsync(error),
  );
}

export function createCategory(
  category: string,
): ResultAsync<{ path: string; commitSha?: string }, AppError> {
  return getContentStore().match(
    (store) => store.createCategory(category),
    (error) => errAsync(error),
  );
}

export function deleteCategory(
  category: string,
): ResultAsync<{ deleted: true; commitSha?: string }, AppError> {
  return getContentStore().match(
    (store) => store.deleteCategory(category),
    (error) => errAsync(error),
  );
}
