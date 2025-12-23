import { type MdxDocument } from "@/lib/api/types";

export interface PostSummary {
  path: string; // path without .mdx extension
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  categories?: string[];
  cover?: string | null;
  status?: string;
}

export interface PostDetail extends PostSummary {
  content: string;
}

export function mapDocToPost(doc: MdxDocument): PostDetail {
  const path = stripMdxExtension(doc.path);
  const title = stringValue(doc.meta.title) ?? path;
  const summary = stringValue(doc.meta.summary) ?? doc.content.slice(0, 200);
  const tagList = toStringArray(doc.meta.tags);
  const categoryFromPath = path.includes("/") ? path.split("/")[0] : undefined;
  const categorySlugs = categoryFromPath ? [categoryFromPath] : undefined;
  const cover = stringValue(doc.meta.coverImageUrl) ?? null;

  return {
    path,
    title,
    excerpt: summary ?? "",
    date:
      timestampToIso(doc.meta.createdAt ?? doc.meta.updatedAt) ??
      new Date().toISOString(),
    tags: tagList,
    categories: categorySlugs,
    cover,
    status: stringValue(doc.meta.status),
    content: doc.content,
  };
}

function stripMdxExtension(path: string): string {
  return path.replace(/\.mdx?$/i, "");
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
