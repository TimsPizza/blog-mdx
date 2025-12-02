import { mapDocToPost } from "@/lib/server/posts";
import { getContentStore, listDocuments } from "@/lib/server/content-store";
import { createD1ClientFromEnv, ViewsRepository } from "@/lib/db/d1";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const docs = await listDocuments();
  const doc = docs.find((d) => d.slug.replace(/\.mdx?$/, "") === slug);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const post = mapDocToPost(doc);

  const viewsRepo = new ViewsRepository(createD1ClientFromEnv());
  const views = await viewsRepo.increment(slug);

  return NextResponse.json({
    post,
    sha: doc.sha,
    views,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json();
  const content = String(body.content ?? "");
  const sha = body.sha ? String(body.sha) : undefined;
  const message = body.message ? String(body.message) : `chore: update ${slug}`;

  const client = getContentStore();
  const result = await client.upsertDoc({
    slug: `${slug}.mdx`,
    content,
    sha,
    message,
  });

  return NextResponse.json(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json();
  const sha = String(body.sha ?? "");
  const message = body.message ? String(body.message) : `chore: delete ${slug}`;

  const client = getContentStore();
  const result = await client.deleteDoc({
    slug: `${slug}.mdx`,
    sha,
    message,
  });

  return NextResponse.json(result);
}
