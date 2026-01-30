"use client";
import { FeaturedPostCard } from "@/components/home/featured-post-card";
import { Pagination } from "@/components/ui/pagination";
import { type Category, type Post } from "@/lib/api";

interface PostsGridProps {
  posts: Post[];
  currentPage: number;
  totalPages: number;
  categories?: Category[];
}

export function PostsGrid({
  posts,
  currentPage,
  totalPages,
  categories = [],
}: PostsGridProps) {
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const categoryId = post.categories?.[0];
          const category =
            typeof categoryId === "number"
              ? categoryMap.get(categoryId) ?? null
              : null;
          return (
            <FeaturedPostCard
              key={post.id}
              post={post}
              coverUrl={post.featured_media ?? null}
              category={category}
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}
