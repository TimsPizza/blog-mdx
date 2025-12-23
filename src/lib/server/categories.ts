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
    const slugPath = doc.path.replace(/\.mdx?$/i, "");
    const categoryFromPath = slugPath.includes("/")
      ? slugPath.split("/")[0]
      : undefined;
    if (!categoryFromPath) continue;
    const existing = categories.get(categoryFromPath);
    if (existing) {
      categories.set(categoryFromPath, {
        ...existing,
        count: existing.count + 1,
      });
    } else {
      categories.set(categoryFromPath, {
        id: nextId++,
        name: categoryFromPath,
        slug: categoryFromPath,
        count: 1,
      });
    }
  }

  return Array.from(categories.values());
}
