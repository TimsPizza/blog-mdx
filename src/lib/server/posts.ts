import { type MdxDocument } from "@/lib/api/types";

export interface PostSummary {
  slug: string;
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
  const slug = stripMdxExtension(doc.slug);
  const title = stringValue(doc.meta.title) ?? slug;
  const summary =
    stringValue(doc.meta.summary) ??
    stringValue(doc.meta.description) ??
    doc.content.slice(0, 200);
  const tagList = toStringArray(doc.meta.tags);
  const categorySlugs = toStringArray(doc.meta.categories ?? tagList);
  const cover =
    stringValue(doc.meta.coverImageId) ?? stringValue(doc.meta.cover) ?? null;

  return {
    slug,
    title,
    excerpt: summary ?? "",
    date:
      stringValue(doc.meta.date) ??
      stringValue(doc.meta.publishedAt) ??
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
