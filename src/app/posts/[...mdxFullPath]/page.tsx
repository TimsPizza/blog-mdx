import { ArticleView } from "@/components/posts/article-view";
import {
  getAllPosts,
  getCategoryById,
  getFeaturedMediaById,
} from "@/lib/api";
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

  return (
    <ArticleView post={post} category={category} media={media} />
  );
}
