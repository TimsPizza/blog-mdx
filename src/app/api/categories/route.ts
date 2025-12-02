import { buildCategoriesFromDocs } from "@/lib/server/categories";
import { listDocuments } from "@/lib/server/content-store";
import { NextResponse } from "next/server";

export async function GET() {
  const docs = await listDocuments();
  const categories = buildCategoriesFromDocs(docs);
  return NextResponse.json({ items: categories });
}
