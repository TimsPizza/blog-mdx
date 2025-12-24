import { Container, Section } from "@/components/craft";
import { PostsGrid, type ExtendedPost } from "@/components/posts/posts-grid";
import {
  getAllCategories,
  getAllPosts,
  getFeaturedMediaById,
} from "@/lib/api";
import { notFound } from "next/navigation";

type CategoryParams = {
  slug: string;
};

type CategoryPageSearchParams = {
  page?: string;
};

const POSTS_PER_PAGE = 12;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<CategoryParams>;
  searchParams?: CategoryPageSearchParams;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const page = parseInt(searchParams?.page || "1", 10);

  const categories = await getAllCategories().match(
    (items) => items,
    () => [],
  );
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const posts = await getAllPosts({ category: category.id }).match(
    (items) => items,
    () => [],
  );
  const hydratedPosts = await Promise.all(
    posts.map(async (post) => {
      const media = post.featured_media
        ? await getFeaturedMediaById(post.featured_media).match(
            (value) => value,
            () => null,
          )
        : null;
      const nextPost: ExtendedPost = post;
      if (media) {
        nextPost._media = media;
      }
      nextPost._category = { id: category.id, name: category.name };
      return nextPost;
    }),
  );

  const totalPages = Math.ceil(hydratedPosts.length / POSTS_PER_PAGE);
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);
  const paginatedPosts = hydratedPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  return (
    <Section>
      <Container className="space-y-8">
        <div>
          <h1 className="text-foreground/90 mb-4 text-3xl font-medium tracking-tight sm:text-4xl">
            {category.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {category.count} 篇文章
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
