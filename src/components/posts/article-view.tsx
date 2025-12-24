"use client";
import { MdxRendered } from "@/components/mdx/mdx-renderer";
import { type Post } from "@/lib/api";
import { ArticleViewClient } from "./article-view-client";

interface ArticleProps {
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

export function ArticleView({ post, author, category, media }: ArticleProps) {
  return (
    <ArticleViewClient
      post={post}
      author={author}
      category={category}
      media={media}
      contentSource={post.content.mdx}
    >
      <MdxRendered mdxSourceString={post.content.mdx} />
    </ArticleViewClient>
  );
}
