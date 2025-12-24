import ArticleEditor from "@/components/admin/article-editor";
import { getContentStore } from "@/lib/server/content-store";
import { errAsync } from "neverthrow";

export default async function ArticleEditPage({
  params,
}: {
  params: Promise<{ mdxPath: string[] }>; // e.g., ["category", "my-first-article"]
}) {
  const resolvedParams = await params;
  const origMdxPath = resolvedParams.mdxPath?.join("/") ?? "";
  if (!origMdxPath) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">缺少 mdxPath 参数。</p>
      </div>
    );
  }

  const doc = await getContentStore()
    .match(
      (store) => store.getDoc(origMdxPath),
      (error) => errAsync(error),
    )
    .match(
      (value) => value,
      (error) => {
        console.error("Failed to load article", error);
        return null;
      },
    );

  if (!doc) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">文章未找到。</p>
      </div>
    );
  }

  return <ArticleEditor isNewArticle={false} initialDoc={doc} />;
}
