import { Container, Section } from "@/components/craft";
import { PostsGrid } from "@/components/posts/posts-grid";
import { getAllCategories, getAllPosts } from "@/lib/api";
import { notFound } from "next/navigation";

type CategoryParams = {
  slug: string; // category name
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
  searchParams?: Promise<CategoryPageSearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slug = resolvedParams.slug;
  const page = parseInt(resolvedSearchParams?.page || "1", 10);

  const categories = await getAllCategories().match(
    (items) => items,
    () => [],
  );
  const category = categories.find((item) => item.path === slug);
  if (!category) notFound();

  const posts = await getAllPosts({ category: category.id }).match(
    (items) => items,
    () => [],
  );
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);
  const paginatedPosts = posts.slice(
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
            {category.count} Post(s)
          </p>
        </div>

        <PostsGrid
          posts={paginatedPosts}
          currentPage={currentPage}
          totalPages={totalPages}
          categories={categories}
        />
      </Container>
    </Section>
  );
}
