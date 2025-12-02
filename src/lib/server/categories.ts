import { type MdxDocument } from "@/lib/api/types";

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export function buildCategoriesFromDocs(docs: MdxDocument[]): Category[] {
  const categories = new Map<string, Category>();
  let nextId = 1;

  for (const doc of docs) {
    const slugs =
      toStringArray(doc.meta.categories) ?? toStringArray(doc.meta.tags);
    if (!slugs) continue;
    for (const slug of slugs) {
      const existing = categories.get(slug);
      if (existing) {
        categories.set(slug, { ...existing, count: existing.count + 1 });
      } else {
        categories.set(slug, { id: nextId++, name: slug, slug, count: 1 });
      }
    }
  }

  return Array.from(categories.values());
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
