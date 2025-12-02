import ArticleEditor from "@/components/admin/article-editor";
import { getContentStore } from "@/lib/server/content-store";

export default async function ArticleEditPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  if (!slug) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">缺少 slug 参数。</p>
      </div>
    );
  }

  let initialContent = "";
  let initialMeta = "";
  try {
    const client = getContentStore();
    const { doc } = await client.getDoc(slug);
    initialContent = doc.content;
    initialMeta = JSON.stringify(doc.meta ?? {}, null, 2);
  } catch (err) {
    console.error("Failed to load article", err);
  }

  return (
    <ArticleEditor
      slug={slug}
      initialContent={initialContent}
      initialMeta={initialMeta}
    />
  );
}
