import { GitHubContentStore } from "@/lib/api/github";
import { type MdxDocument } from "@/lib/api/types";

type RepoConfig = {
  owner: string;
  repo: string;
  branch?: string;
};

function parseRepoUrl(url: string | undefined): RepoConfig {
  if (!url) {
    throw new Error("MDX_REPO_URL is not set");
  }
  const trimmed = url.trim();
  const match = trimmed.match(
    /github\.com[:/]+([^/]+)\/([^/#?]+)(?:[#?](.*))?/i,
  );
  if (!match) {
    throw new Error(
      `MDX_REPO_URL must be a GitHub repo URL like https://github.com/owner/repo (got ${url})`,
    );
  }
  const owner = match[1];
  const repo = match[2];
  const rest = match[3];
  const branch = rest ? rest.replace(/^ref=|^#/, "") : undefined;
  return {
    owner,
    repo: repo.replace(/\.git$/, ""),
    branch,
  };
}

let cachedStore: GitHubContentStore | null = null;

export function getContentStore(): GitHubContentStore {
  if (cachedStore) return cachedStore;
  const repoConfig = parseRepoUrl(process.env.MDX_REPO_URL);
  const token =
    process.env.GITHUB_REPO_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_REPO_ACCESS_TOKEN (or GITHUB_TOKEN) is required to fetch MDX content from GitHub.",
    );
  }
  cachedStore = new GitHubContentStore({
    owner: repoConfig.owner,
    repo: repoConfig.repo,
    branch: repoConfig.branch,
    docsPath: "content",
    token,
  });
  return cachedStore;
}

export async function listDocuments(): Promise<MdxDocument[]> {
  return getContentStore().listDocsWithContent();
}
