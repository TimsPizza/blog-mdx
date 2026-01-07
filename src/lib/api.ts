import { type MdxDocument } from "@/lib/api/types";
import { listDocuments } from "@/lib/server/content-store";
import { AppError } from "@/types/error";
import { okAsync, type ResultAsync } from "neverthrow";

export interface Post {
  id: string;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { mdx: string };
  date: string;
  categories?: number[];
  tags?: string[];
  featured_media?: string | null;
  meta?: { views?: number };
}

export interface Category {
  id: number;
  name: string;
  path: string;
  count: number;
}

function fetchDocs(): ResultAsync<MdxDocument[], AppError> {
  return listDocuments();
}

export function getAllPosts(params?: {
  search?: string;
  category?: number | string;
  tag?: string;
  status?: "draft" | "published" | "archived";
}): ResultAsync<Post[], AppError> {
  return fetchDocs().map((docs) => {
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

    posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return posts;
  });
}

export function getAllCategories(): ResultAsync<Category[], AppError> {
  return fetchDocs().map((docs) => Array.from(buildCategoryMap(docs).values()));
}

export function getCategoryById(
  id: number,
): ResultAsync<Category | null, AppError> {
  return getAllCategories().map(
    (categories) => categories.find((cat) => cat.id === id) ?? null,
  );
}

export function getAuthorById(): ResultAsync<
  { name: string } | null,
  AppError
> {
  // Author metadata is not modeled; return a placeholder to satisfy callers.
  return okAsync(null);
}

export function getFeaturedMediaById(
  id: string | number | null,
): ResultAsync<{ source_url: string } | null, AppError> {
  if (!id) return okAsync(null);
  const url = String(id);
  return okAsync({ source_url: url });
}

function mdxToPost(doc: MdxDocument, categories: Map<string, Category>): Post {
  const slug = stripMdxExtension(doc.path);
  const title = stringValue(doc.meta.title) ?? slug;
  const summary = stringValue(doc.meta.summary) ?? doc.content.slice(0, 200);
  const excerpt = escapeHtml(summary);

  const tagList = toStringArray(doc.meta.tags);
  const categoryFromPath = slug.includes("/") ? slug.split("/")[0] : undefined;
  const categorySlugs = categoryFromPath ? [categoryFromPath] : undefined;
  const categoryIds = categorySlugs
    ?.map((slugItem) => categories.get(slugItem)?.id)
    .filter((id): id is number => typeof id === "number");

  const cover = stringValue(doc.meta.coverImageUrl) ?? null;

  return {
    id: slug,
    slug,
    title: { rendered: escapeHtml(title) },
    excerpt: { rendered: excerpt },
    content: { mdx: doc.content },
    date:
      timestampToIso(doc.meta.createdAt ?? doc.meta.updatedAt) ??
      new Date().toISOString(),
    categories: categoryIds,
    tags: tagList,
    featured_media: cover,
  };
}

function stripMdxExtension(path: string): string {
  return path.replace(/\.mdx?$/i, "");
}

function buildCategoryMap(docs: MdxDocument[]): Map<string, Category> {
  const categories = new Map<string, Category>();
  let nextId = 1;

  for (const doc of docs) {
    const slugPath = stripMdxExtension(doc.path);
    const categoryFromPath = slugPath.includes("/")
      ? slugPath.split("/")[0]
      : undefined;
    if (!categoryFromPath) continue;
    const slug = categoryFromPath;
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
        path: slug,
        count: 1,
      });
    }
  }

  return categories;
}

function stringValue(input: unknown): string | undefined {
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
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

function timestampToIso(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
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
  frontmatter?: { status?: unknown } | null,
): "draft" | "published" | "archived" | undefined {
  if (!frontmatter) return undefined;
  const value = frontmatter.status;
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }
  return undefined;
}
