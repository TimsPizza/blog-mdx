import { getContentStore } from "@/lib/server/content-store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json();
  const expectedSha = body.sha ? String(body.sha) : undefined;
  const message = body.message
    ? String(body.message)
    : `chore: unarchive ${slug}`;

  const client = getContentStore();
  const result = await client.unarchiveDoc({
    slug: `${slug}.mdx`,
    expectedSha,
    message,
  });

  return NextResponse.json(result);
}
