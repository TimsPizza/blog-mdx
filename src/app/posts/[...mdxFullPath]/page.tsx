import { ArticleViewServer } from "@/components/posts/article-view-server";
import { getAllPosts, getCategoryById, getFeaturedMediaById } from "@/lib/api";
import { VisitsRepository } from "@/lib/db/visits-repo";
import { getClientIp, requireDb } from "@/lib/util";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

type PostParams = {
  mdxFullPath: string[];
};

export default async function PostPage({
  params,
}: {
  params: Promise<PostParams>;
}) {
  const { mdxFullPath } = await params;
  const slugPath = mdxFullPath.join("/").replace(/\.mdx?$/i, "");

  const posts = await getAllPosts().match(
    (items) => items,
    () => [],
  );
  const post = posts.find((item) => item.slug === slugPath);
  if (!post) notFound();

  const category = post.categories?.[0]
    ? await getCategoryById(post.categories[0]).match(
        (value) => value,
        () => null,
      )
    : null;
  const media = post.featured_media
    ? await getFeaturedMediaById(post.featured_media).match(
        (value) => value,
        () => null,
      )
    : null;

  if (post.articleUid && post.articlePath) {
    const headerStore = await headers();
    const ip = getClientIp(
      new Request("http://localhost", { headers: headerStore }),
    );
    const ua = headerStore.get("user-agent");
    await requireDb()
      .andThen((db) =>
        new VisitsRepository(db).recordVisit({
          articlePath: post.articlePath ?? slugPath,
          articleUid: post.articleUid ?? "",
          ip: ip ?? null,
          ua: ua ?? null,
        }),
      )
      .match(
        () => undefined,
        () => undefined,
      );
  }

  return <ArticleViewServer post={post} category={category} media={media} />;
}
