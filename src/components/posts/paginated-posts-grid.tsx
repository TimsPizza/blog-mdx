"use client";

import { PostsGrid } from "@/components/posts/posts-grid";
import { type Category, type PostSummary } from "@/lib/api";
import { useEffect, useState } from "react";

const POSTS_PER_PAGE = 12;

type PaginatedPostsGridProps = {
  basePath: string;
  categories?: Category[];
  posts: PostSummary[];
};

export function PaginatedPostsGrid({
  basePath,
  categories = [],
  posts,
}: PaginatedPostsGridProps) {
  const [requestedPage, setRequestedPage] = useState(1);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const page = Number.parseInt(params.get("page") ?? "1", 10);
      setRequestedPage(Number.isNaN(page) ? 1 : Math.max(1, page));
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const paginatedPosts = posts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  return (
    <PostsGrid
      posts={paginatedPosts}
      currentPage={currentPage}
      totalPages={totalPages}
      categories={categories}
      getPageHref={(page) =>
        page > 1 ? `${basePath}?page=${page}` : basePath
      }
      onPageChange={(page) => {
        setRequestedPage(page);
        window.history.pushState(
          null,
          "",
          page > 1 ? `${basePath}?page=${page}` : basePath,
        );
      }}
    />
  );
}
