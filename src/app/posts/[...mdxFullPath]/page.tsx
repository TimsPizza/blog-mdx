import { ArticleViewServer } from "@/components/posts/article-view-server";
import {
  getFeaturedMediaById,
  getPostByPath,
  getPostListingData,
} from "@/lib/api";
import { decodeUrlPathSegments } from "@/lib/utils";
import { notFound } from "next/navigation";

type PostParams = {
  mdxFullPath: string[];
};

export const dynamicParams = true;

export async function generateStaticParams(): Promise<PostParams[]> {
  return getPostListingData().match(
    ({ posts }) =>
      posts.map((post) => ({ mdxFullPath: post.slug.split("/") })),
    () => [],
  );
}

export default async function PostPage({
  params,
}: {
  params: Promise<PostParams>;
}) {
  const { mdxFullPath } = await params;
  const slugPath = decodeUrlPathSegments(mdxFullPath)
    .join("/")
    .replace(/\.mdx?$/i, "");

  const article = await getPostByPath(slugPath, { fresh: true }).match(
    (value) => value,
    () => null,
  );
  if (!article) notFound();
  const { post, category } = article;
  const media = post.featured_media
    ? await getFeaturedMediaById(post.featured_media).match(
        (value) => value,
        () => null,
      )
    : null;

  return <ArticleViewServer post={post} category={category} media={media} />;
}
