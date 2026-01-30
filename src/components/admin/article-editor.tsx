"use client";

import {
  type ArticleEditorProps,
  useArticleEditorController,
} from "@/components/admin/article-editor-controller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";

const MDXEditor = dynamic(
  async () => {
    const mod = await import("@/components/mdx/mdx-editor");
    return mod.MdxEditorWithRegistry;
  },
  { ssr: false },
);

export function ArticleEditor(props: ArticleEditorProps) {
  const { model, actions } = useArticleEditorController(props);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {model.isNewArticle ? "新建文章" : "编辑文章"}
          </p>
          <h1 className="text-2xl font-semibold">
            {model.title || "未命名文章"}
          </h1>
          {model.previewPath && (
            <p className="text-muted-foreground text-xs">
              目标路径：{model.previewPath}
            </p>
          )}
          {model.lastSavedAt && (
            <p className="text-muted-foreground text-xs">
              已保存于 {new Date(model.lastSavedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={actions.clearDraft}>
            清除本地草稿
          </Button>
          <Button onClick={actions.save} disabled={model.saving}>
            {model.saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {model.saveError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {model.saveError}
        </div>
      )}

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">标题</span>
          <Input
            value={model.title}
            onChange={(e) => {
              actions.setTitle(e.target.value);
            }}
            placeholder="请输入标题"
          />
        </label>

        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">分类</span>
          <Input
            list="category-options"
            value={model.category}
            onChange={(e) => {
              actions.setCategory(e.target.value);
            }}
            placeholder="输入分类目录名"
          />
          {model.categoryOptions.length > 0 && (
            <datalist id="category-options">
              {model.categoryOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          )}
        </label>

        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">
            描述 / Summary
          </span>
          <Textarea
            value={model.summary}
            onChange={(e) => {
              actions.setSummary(e.target.value);
            }}
            placeholder="填写文章摘要..."
            className="min-h-30"
          />
        </label>

        <div className="space-y-2">
          <label className="space-y-2">
            <span className="text-foreground/80 text-sm font-medium">
              封面图片 URL
            </span>
            <Input
              value={model.coverImageUrl}
              onChange={(e) => {
                actions.setCoverImageUrl(e.target.value);
              }}
              placeholder="https://example.com/cover.jpg"
            />
          </label>
          {model.coverImageUrl.trim() && (
            <div className="bg-muted flex max-h-64 w-full items-center justify-center overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={model.coverImageUrl}
                alt="cover preview"
                className="max-h-64 w-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span
            id="mdx-content-label"
            className="text-foreground/80 text-sm font-medium"
          >
            MDX 内容
          </span>
          <div
            className="bg-background max-h-4/5 overflow-y-auto rounded-md border"
            role="group"
            aria-labelledby="mdx-content-label"
          >
            <MDXEditor
              markdown={model.content}
              onChange={(value: string) => {
                actions.setContent(value);
              }}
              contentEditableClassName="reading-prose max-w-none min-h-[360px]"
              placeholder="Start writing MDX..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleEditor;
