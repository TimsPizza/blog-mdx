import { Container, Section } from "@/components/craft";
import { ExtendedPost, PostsGrid } from "@/components/posts/posts-grid";
import { SearchFilter } from "@/components/posts/search-filter";
import {
  getAllCategories,
  getAllPosts,
  getFeaturedMediaById,
  type Category,
} from "@/lib/api";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles",
  description: "A collection of all articles on the site.",
};

type PostsPageSearchParams = {
  page?: string;
  q?: string;
  category?: string;
  sort?: "date" | "date-asc" | "views" | "views-asc";
};

const POSTS_PER_PAGE = 12;

export default async function PostsPage({
  searchParams,
}: {
  searchParams?: Promise<PostsPageSearchParams>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams?.page || "1", 10);
  const search = resolvedParams?.q || "";
  const category = resolvedParams?.category;
  const sort = resolvedParams?.sort || "date";

  const categories = await getAllCategories().match(
    (items) => items,
    () => [],
  );

  const queryParams = (() => {
    if (!search && !category) return undefined;

    const params: {
      search?: string;
      category?: number;
    } = {};

    if (search && search.trim() !== "") {
      params.search = search;
    }

    if (category) {
      const categoryId = parseInt(category);
      if (!isNaN(categoryId)) {
        params.category = categoryId;
      }
    }

    return Object.keys(params).length > 0 ? params : undefined;
  })();

  const basePosts = await getAllPosts(queryParams).match(
    (items) => items,
    () => [],
  );
  const allPosts = await Promise.all(
    basePosts.map(async (post) => {
      const media = post.featured_media
        ? await getFeaturedMediaById(post.featured_media).match(
            (value) => value,
            () => null,
          )
        : null;
      if (media) {
        (post as ExtendedPost)._media = media;
      }
      return post as ExtendedPost;
    }),
  );

  const sortedPosts = [...allPosts].sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "views":
        return (
          (parseInt(String(b.meta?.views ?? "0")) || 0) -
          (parseInt(String(a.meta?.views ?? "0")) || 0)
        );
      case "views-asc":
        return (
          (parseInt(String(a.meta?.views ?? "0")) || 0) -
          (parseInt(String(b.meta?.views ?? "0")) || 0)
        );
      case "date":
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const totalPages = Math.ceil(sortedPosts.length / POSTS_PER_PAGE);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginatedPosts = sortedPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  return (
    <Section>
      <Container className="space-y-8">
        <div>
          <h1 className="text-foreground/90 mb-8 text-3xl font-medium tracking-tight sm:text-4xl">
            Articles
          </h1>
          <SearchFilter categories={categories} />
        </div>

        <div className="py-4">
          {/* 结果统计 */}
          <p className="text-muted-foreground/80 text-sm">
            {`Found ${sortedPosts.length} article(s)`}
            {search && `,include keywords "${search}"`}
            {category &&
              `,in category "${categories.find((cat: Category) => cat.id.toString() === category)?.name || category}"`}
          </p>
        </div>

        <PostsGrid
          posts={paginatedPosts}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </Container>
    </Section>
  );
}
