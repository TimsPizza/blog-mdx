import { mapDocToPost } from "@/lib/server/posts";
import { listDocuments } from "@/lib/server/content-store";
import { jsonError } from "@/lib/server/http";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q")?.toLowerCase() ?? undefined;

  return listDocuments()
    .map((docs) => {
      let posts = docs.map(mapDocToPost);

      if (status) {
        posts = posts.filter((post) => post.status === status);
      }
      if (tag) {
        posts = posts.filter((post) => post.tags?.some((t) => t === tag));
      }
      if (category) {
        posts = posts.filter((post) =>
          post.categories?.some((c) => c === category),
        );
      }
      if (q) {
        posts = posts.filter(
          (post) =>
            post.title.toLowerCase().includes(q) ||
            post.excerpt.toLowerCase().includes(q),
        );
      }

      posts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return posts;
    })
    .match(
      (posts) => NextResponse.json({ items: posts }),
      jsonError,
    );
}
