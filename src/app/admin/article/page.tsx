import ArticleAdminClient, {
  type ArticleListItem,
} from "@/components/admin/article-list";
import { listDocuments } from "@/lib/server/content-store";
import { mapDocToPost } from "@/lib/server/posts";

export default async function AdminArticlePage() {
  const docs = await listDocuments();
  const items: ArticleListItem[] = docs.map((doc) => {
    const post = mapDocToPost(doc);
    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      date: post.date,
      tags: post.tags,
      categories: post.categories,
      status: post.status,
    };
  });

  return <ArticleAdminClient initialItems={items} totalCount={items.length} />;
}
