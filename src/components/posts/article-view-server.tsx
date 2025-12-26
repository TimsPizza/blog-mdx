import { MdxRendered } from "@/components/mdx/mdx-renderer";
import { type Post } from "@/lib/api";
import { ArticleView } from "./article-view";

interface ArticleViewServerProps {
  post: Post;
  author?: {
    name: string;
  } | null;
  category?: {
    name: string;
  } | null;
  media?: {
    source_url: string;
  } | null;
}

export function ArticleViewServer({
  post,
  author,
  category,
  media,
}: ArticleViewServerProps) {
  return (
    <ArticleView
      post={post}
      author={author}
      category={category}
      media={media}
    >
      <MdxRendered mdxSourceString={post.content.mdx} />
    </ArticleView>
  );
}
