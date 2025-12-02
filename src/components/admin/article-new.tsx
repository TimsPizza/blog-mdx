"use client";

import ArticleEditor from "@/components/admin/article-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ArticleNew() {
  const [slug, setSlug] = useState("");
  const [confirmedSlug, setConfirmedSlug] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!slug.trim()) return;
    setConfirmedSlug(slug.trim());
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="输入新文章目录名，如 my-first-blog"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Button onClick={handleConfirm} disabled={!slug.trim()}>
            开始编辑
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          创建时将生成 <code>{slug || "your-slug"}/content.mdx</code> 与{" "}
          <code>meta.json</code>（后端保存时写入）。
        </p>
      </div>

      {confirmedSlug && (
        <ArticleEditor slug={confirmedSlug} initialContent="" initialMeta="" />
      )}
    </div>
  );
}
