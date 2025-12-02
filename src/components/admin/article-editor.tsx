"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useArticleDraftStore } from "@/lib/stores/article-draft";
import dynamic from "next/dynamic";
import "@mdxeditor/editor/style.css";
import { useMemo } from "react";

const MDXEditor = dynamic(
  async () => {
    const mod = await import("@mdxeditor/editor");
    return mod.MDXEditor;
  },
  { ssr: false },
);

export function ArticleEditor({
  slug,
  initialContent = "",
  initialMeta = "",
}: {
  slug: string;
  initialContent?: string;
  initialMeta?: string;
}) {
  const { drafts, setDraft, clearDraft } = useArticleDraftStore();
  const draft = useMemo(() => drafts[slug] ?? null, [drafts, slug]);
  const content = draft?.content ?? initialContent ?? "";
  const meta = draft?.meta ?? initialMeta ?? "";

  const handleFrontmatterChange = (value: string) => {
    if (!slug) return;
    setDraft(slug, (prev) => ({
      content: prev?.content ?? content,
      meta: value,
      updatedAt: Date.now(),
    }));
  };

  const handleContentChange = (value: string) => {
    if (!slug) return;
    setDraft(slug, (prev) => ({
      content: value,
      meta: prev?.meta ?? meta,
      updatedAt: Date.now(),
    }));
  };

  const handleClear = () => {
    if (!slug) return;
    clearDraft(slug);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">正在编辑</p>
          <h1 className="text-2xl font-semibold">{slug}</h1>
          {draft?.updatedAt && (
            <p className="text-muted-foreground text-xs">
              本地草稿保存于 {new Date(draft.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClear}>
            清除本地草稿
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">
            Frontmatter (YAML)
          </span>
          <Textarea
            className="min-h-[160px]"
            placeholder={`title: Example\nstatus: draft\ntags: [dev, notes]`}
            value={meta}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleFrontmatterChange(e.target.value)
            }
          />
        </label>

        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">
            MDX 内容
          </span>
          <div className="bg-background rounded-md border">
            <MDXEditor
              markdown={content}
              onChange={(val: string) => handleContentChange(val)}
              contentEditableClassName="prose max-w-none min-h-[360px] p-4"
              placeholder="Start writing MDX..."
            />
          </div>
        </label>
      </div>
    </div>
  );
}

export default ArticleEditor;
