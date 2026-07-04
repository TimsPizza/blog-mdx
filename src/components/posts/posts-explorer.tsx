"use client";

import { PostsGrid } from "@/components/posts/posts-grid";
import { SearchFilter } from "@/components/posts/search-filter";
import { type Category, type PostSummary } from "@/lib/api";
import { useEffect, useState } from "react";

const POSTS_PER_PAGE = 12;
const DEFAULT_QUERY_STATE = {
  category: "",
  page: 1,
  search: "",
  sort: "date",
};

type PostsQueryState = typeof DEFAULT_QUERY_STATE;

type PostsExplorerProps = {
  categories: Category[];
  posts: PostSummary[];
};

export function PostsExplorer({ categories, posts }: PostsExplorerProps) {
  const [query, setQuery] = useState<PostsQueryState>(DEFAULT_QUERY_STATE);

  useEffect(() => {
    const syncFromUrl = () => setQuery(readQueryState());
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const search = query.search.trim().toLowerCase();
  const category = query.category;

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !search ||
      post.title.rendered.toLowerCase().includes(search) ||
      post.excerpt.rendered.toLowerCase().includes(search);
    const categoryId = category ? Number.parseInt(category, 10) : null;
    const matchesCategory =
      categoryId === null ||
      Number.isNaN(categoryId) ||
      post.categories?.includes(categoryId);
    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (query.sort) {
      case "date-asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "views":
        return (b.meta?.views ?? 0) - (a.meta?.views ?? 0);
      case "views-asc":
        return (a.meta?.views ?? 0) - (b.meta?.views ?? 0);
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedPosts.length / POSTS_PER_PAGE),
  );
  const currentPage = Math.min(Math.max(1, query.page), totalPages);
  const paginatedPosts = sortedPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  const updateQuery = (patch: Partial<PostsQueryState>) => {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    window.history.pushState(null, "", buildPostsUrl(nextQuery));
  };

  const getPageHref = (page: number) =>
    buildPostsUrl({ ...query, page });

  return (
    <>
      <SearchFilter
        categories={categories}
        category={query.category}
        search={query.search}
        sort={query.sort}
        onCategoryChange={(nextCategory) =>
          updateQuery({ category: nextCategory, page: 1 })
        }
        onReset={() => {
          setQuery(DEFAULT_QUERY_STATE);
          window.history.pushState(null, "", "/posts");
        }}
        onSearch={(nextSearch) =>
          updateQuery({ search: nextSearch, page: 1 })
        }
        onSortChange={(nextSort) =>
          updateQuery({ sort: nextSort, page: 1 })
        }
      />

      <div className="py-4">
        <p className="text-muted-foreground/80 text-sm">
          {`Found ${sortedPosts.length} article(s)`}
          {search && `, include keywords "${search}"`}
          {category &&
            `, in category "${
              categories.find((item) => item.id.toString() === category)
                ?.name ?? category
            }"`}
        </p>
      </div>

      <PostsGrid
        posts={paginatedPosts}
        currentPage={currentPage}
        totalPages={totalPages}
        categories={categories}
        getPageHref={getPageHref}
        onPageChange={(page) => updateQuery({ page })}
      />
    </>
  );
}

function readQueryState(): PostsQueryState {
  const params = new URLSearchParams(window.location.search);
  const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    category: params.get("category") ?? "",
    page: Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage),
    search: params.get("q") ?? "",
    sort: params.get("sort") ?? "date",
  };
}

function buildPostsUrl(query: PostsQueryState): string {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.sort !== "date") params.set("sort", query.sort);
  if (query.category) params.set("category", query.category);
  if (query.page > 1) params.set("page", query.page.toString());
  const search = params.toString();
  return search ? `/posts?${search}` : "/posts";
}
