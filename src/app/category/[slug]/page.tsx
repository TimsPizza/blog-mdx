import { Container, Section } from "@/components/craft";
import { PaginatedPostsGrid } from "@/components/posts/paginated-posts-grid";
import { getPostListingData } from "@/lib/api";
import { notFound } from "next/navigation";

type CategoryParams = {
  slug: string; // category name
};

export const dynamicParams = true;

export async function generateStaticParams(): Promise<CategoryParams[]> {
  return getPostListingData().match(
    ({ categories }) => categories.map(({ path }) => ({ slug: path })),
    () => [],
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<CategoryParams>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const { posts: allPosts, categories } = await getPostListingData({
    fresh: true,
  }).match(
    (data) => data,
    () => ({ posts: [], categories: [] }),
  );
  const category = categories.find((item) => item.path === slug);
  if (!category) notFound();

  const posts = allPosts.filter((post) =>
    post.categories?.includes(category.id),
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

        <PaginatedPostsGrid
          basePath={`/category/${slug}`}
          posts={posts}
          categories={categories}
        />
      </Container>
    </Section>
  );
}
