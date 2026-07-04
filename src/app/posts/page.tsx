import { Container, Section } from "@/components/craft";
import { PostsExplorer } from "@/components/posts/posts-explorer";
import { getPostListingData } from "@/lib/api";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles",
  description: "A collection of all articles on the site.",
};

export default async function PostsPage() {
  const { posts, categories } = await getPostListingData({ fresh: true }).match(
    (data) => data,
    () => ({ posts: [], categories: [] }),
  );

  return (
    <Section>
      <Container className="space-y-8">
        <div>
          <h1 className="text-foreground/90 mb-8 text-3xl font-medium tracking-tight sm:text-4xl">
            Articles
          </h1>
        </div>
        <PostsExplorer posts={posts} categories={categories} />
      </Container>
    </Section>
  );
}
