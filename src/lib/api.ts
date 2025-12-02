import { GitHubContentStore } from "@/lib/api/github";
import { type MdxDocument } from "@/lib/api/types";

export interface Post {
  id: string;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  categories?: number[];
  tags?: string[];
  featured_media?: string | null;
  meta?: { views?: number };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

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

const repoConfig = parseRepoUrl(process.env.MDX_REPO_URL);
const repoToken =
  process.env.GITHUB_REPO_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN;

if (!repoToken) {
  throw new Error(
    "GITHUB_REPO_ACCESS_TOKEN is required to fetch MDX content from GitHub.",
  );
}

const client = new GitHubContentStore({
  owner: repoConfig.owner,
  repo: repoConfig.repo,
  branch: repoConfig.branch,
  docsPath: "content",
  token: repoToken,
});

async function fetchDocs(): Promise<MdxDocument[]> {
  return client.listDocsWithContent();
}

export async function getAllPosts(params?: {
  search?: string;
  category?: number | string;
  tag?: string;
  status?: "draft" | "published" | "archived";
}): Promise<Post[]> {
  const docs = await fetchDocs();
  const categories = buildCategoryMap(docs);

  let filteredDocs = docs;
  if (params?.status) {
    filteredDocs = docs.filter(
      (doc) => docStatusFromFrontmatter(doc.meta) === params.status,
    );
  }

  let posts = filteredDocs.map((doc) => mdxToPost(doc, categories));

  if (params?.search) {
    const query = params.search.toLowerCase();
    posts = posts.filter(
      (post) =>
        post.title.rendered.toLowerCase().includes(query) ||
        post.excerpt.rendered.toLowerCase().includes(query),
    );
  }

  if (params?.category) {
    const catId = Number(params.category);
    posts = posts.filter((post) => post.categories?.includes(catId));
  }

  if (params?.tag) {
    const tag = params.tag.toLowerCase();
    posts = posts.filter((post) =>
      post.tags?.some((t) => t.toLowerCase() === tag),
    );
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export async function getAllCategories(): Promise<Category[]> {
  const docs = await fetchDocs();
  const categories = buildCategoryMap(docs);
  return Array.from(categories.values());
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const categories = await getAllCategories();
  return categories.find((cat) => cat.id === id) ?? null;
}

export async function getAuthorById(): Promise<{ name: string } | null> {
  // Author metadata is not modeled; return a placeholder to satisfy callers.
  return null;
}

export async function getFeaturedMediaById(
  id: string | number | null,
): Promise<{ source_url: string } | null> {
  if (!id) return null;
  const url = String(id);
  return { source_url: url };
}

function mdxToPost(doc: MdxDocument, categories: Map<string, Category>): Post {
  const slug = stripMdxExtension(doc.slug);
  const title = stringValue(doc.meta.title) ?? slug;
  const summary =
    stringValue(doc.meta.summary) ??
    stringValue(doc.meta.description) ??
    doc.content.slice(0, 200);
  const content = escapeHtml(doc.content);
  const excerpt = escapeHtml(summary);

  const tagList = toStringArray(doc.meta.tags);
  const categorySlugs = toStringArray(doc.meta.categories ?? tagList);
  const categoryIds = categorySlugs
    ?.map((slugItem) => categories.get(slugItem)?.id)
    .filter((id): id is number => typeof id === "number");

  const cover =
    stringValue(doc.meta.coverImageId) ?? stringValue(doc.meta.cover) ?? null;

  return {
    id: slug,
    slug,
    title: { rendered: escapeHtml(title) },
    excerpt: { rendered: excerpt },
    content: { rendered: content },
    date:
      stringValue(doc.meta.date) ??
      stringValue(doc.meta.publishedAt) ??
      new Date().toISOString(),
    categories: categoryIds,
    tags: tagList,
    featured_media: cover,
    meta: {
      views: numberValue(doc.meta.views),
    },
  };
}

function stripMdxExtension(path: string): string {
  return path.replace(/\.mdx?$/i, "");
}

function buildCategoryMap(docs: MdxDocument[]): Map<string, Category> {
  const categories = new Map<string, Category>();
  let nextId = 1;

  for (const doc of docs) {
    const slugs =
      toStringArray(doc.meta.categories) ?? toStringArray(doc.meta.tags);
    if (!slugs) continue;
    for (const slug of slugs) {
      const existing = categories.get(slug);
      if (existing) {
        categories.set(slug, {
          ...existing,
          count: existing.count + 1,
        });
      } else {
        categories.set(slug, {
          id: nextId++,
          name: slug,
          slug,
          count: 1,
        });
      }
    }
  }

  return categories;
}

function stringValue(input: unknown): string | undefined {
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}

function numberValue(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const num = Number(input);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const arr = value
      .map((v) => (typeof v === "string" ? v.trim() : String(v)))
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof value === "string") {
    const arr = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function docStatusFromFrontmatter(
  frontmatter: Record<string, unknown> | undefined,
): "draft" | "published" | "archived" | undefined {
  if (!frontmatter) return undefined;
  const value = frontmatter.status;
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }
  return undefined;
}
