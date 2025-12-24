"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type MdxDocument } from "@/lib/api/types";
import {
  type ArticleDraft,
  useArticleDraftStore,
} from "@/lib/stores/article-draft";
import "@mdxeditor/editor/style.css";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const MDXEditor = dynamic(
  async () => {
    const mod = await import("@/components/mdx/mdx-editor");
    return mod.MdxEditorWithRegistry;
  },
  { ssr: false },
);

type ArticleEditorProps = {
  isNewArticle: boolean;
  initialDoc?: MdxDocument;
};

type PreservedMeta = {
  tags?: string[];
  coverImageUrl?: string;
  status?: "draft" | "published" | "archived";
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

const ensureUid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `uid-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const slugifyTitle = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const normalizeCategory = (value: string) => {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed.split("/")[0] ?? "";
};

const stripMdxExtension = (path: string) => path.replace(/\.mdx?$/i, "");

const parsePathParts = (path?: string) => {
  if (!path) return { category: "", fileStem: "" };
  const normalized = stripMdxExtension(path);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return { category: "", fileStem: "" };
  if (segments.length === 1) return { category: "", fileStem: segments[0] };
  return {
    category: segments[0],
    fileStem: segments[segments.length - 1],
  };
};

const resolveDocPath = (
  categoryValue: string,
  titleValue: string,
  base: { category: string; title: string; fileStem: string },
) => {
  const normalizedCategory = normalizeCategory(categoryValue);
  const trimmedTitle = titleValue.trim();
  const titleChanged = trimmedTitle !== base.title.trim();
  const derivedStem = slugifyTitle(trimmedTitle);
  const fileStem = titleChanged || !base.fileStem ? derivedStem : base.fileStem;
  if (!normalizedCategory || !fileStem) return null;
  return `${normalizedCategory}/${fileStem}.mdx`;
};

export function ArticleEditor({
  isNewArticle,
  initialDoc,
}: ArticleEditorProps) {
  const { drafts, setDraft, clearDraft } = useArticleDraftStore();
  const [initialTimestamp] = useState(() => nowSeconds());
  const basePath = initialDoc?.path ?? "";
  const { category: baseCategoryFromPath, fileStem: baseFileStem } = useMemo(
    () => parsePathParts(basePath),
    [basePath],
  );
  const baseCategory =
    initialDoc?.meta.originalCategory ?? baseCategoryFromPath;

  const baseTitle = initialDoc?.meta.title?.trim() || baseFileStem;
  const baseSummary = initialDoc?.meta.summary ?? "";
  const baseContent = initialDoc?.content ?? "";
  const baseUid = initialDoc?.meta.uid ?? ensureUid();
  const baseCreatedAt = initialDoc?.meta.createdAt ?? initialTimestamp;
  const preservedMeta: PreservedMeta = useMemo(
    () => ({
      tags: initialDoc?.meta.tags,
      coverImageUrl: initialDoc?.meta.coverImageUrl,
      status: initialDoc?.meta.status ?? "draft",
    }),
    [initialDoc],
  );

  const draftKey = useMemo(() => basePath || "new-article", [basePath]);
  const draft = useMemo(() => drafts[draftKey] ?? null, [drafts, draftKey]);

  const [title, setTitle] = useState(draft?.title ?? baseTitle);
  const [category, setCategory] = useState(draft?.category ?? baseCategory);
  const [summary, setSummary] = useState(draft?.summary ?? baseSummary);
  const [content, setContent] = useState(draft?.content ?? baseContent);
  const [currentPath, setCurrentPath] = useState(basePath);
  const [sha, setSha] = useState(initialDoc?.sha ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(Boolean(initialDoc));
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const uidRef = useRef(draft?.uid ?? baseUid);
  const createdAtRef = useRef(draft?.createdAt ?? baseCreatedAt);

  useEffect(() => {
    if (!draft) return;
    setTitle(typeof draft.title === "string" ? draft.title : baseTitle);
    setCategory(
      typeof draft.category === "string" ? draft.category : baseCategory,
    );
    setSummary(typeof draft.summary === "string" ? draft.summary : baseSummary);
    setContent(typeof draft.content === "string" ? draft.content : baseContent);
    if (typeof draft.uid === "string") {
      uidRef.current = draft.uid;
    }
    if (typeof draft.createdAt === "number") {
      createdAtRef.current = draft.createdAt;
    }
  }, [baseCategory, baseContent, baseSummary, baseTitle, draft]);

  useEffect(() => {
    let active = true;
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: unknown[] } | null) => {
        if (!active || !data) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setCategoryOptions(
          items.filter((item): item is string => typeof item === "string"),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const persistDraft = (patch: Partial<ArticleDraft>) => {
    setDraft(draftKey, (prev) => ({
      title: patch.title ?? prev?.title ?? title,
      category: patch.category ?? prev?.category ?? category,
      summary: patch.summary ?? prev?.summary ?? summary,
      content: patch.content ?? prev?.content ?? content,
      uid: patch.uid ?? prev?.uid ?? uidRef.current,
      createdAt: patch.createdAt ?? prev?.createdAt ?? createdAtRef.current,
      updatedAt: Date.now(),
    }));
  };

  const handleClearDraft = () => {
    clearDraft(draftKey);
    setTitle(baseTitle);
    setCategory(baseCategory);
    setSummary(baseSummary);
    setContent(baseContent);
    uidRef.current = baseUid;
    createdAtRef.current = baseCreatedAt;
  };

  const baseInfo = useMemo(
    () => ({
      category: baseCategory,
      title: baseTitle,
      fileStem: baseFileStem,
    }),
    [baseCategory, baseFileStem, baseTitle],
  );

  const handleSave = async () => {
    if (saving) return;
    setSaveError(null);

    const nextPath = resolveDocPath(category, title, baseInfo);
    if (!title.trim()) {
      setSaveError("标题不能为空。");
      return;
    }
    if (!category.trim()) {
      setSaveError("分类不能为空。");
      return;
    }
    if (!nextPath) {
      setSaveError("标题或分类格式不正确，无法生成路径。");
      return;
    }

    setSaving(true);
    const now = nowSeconds();

    const needsMove = hasSaved && currentPath && currentPath !== nextPath;
    if (needsMove) {
      const moveRes = await fetch("/api/articles/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPath: currentPath,
          toPath: nextPath,
          message: `chore: move ${currentPath} to ${nextPath}`,
        }),
      });
      if (!moveRes.ok) {
        const text = await moveRes.text();
        setSaveError(text || "移动文章失败。");
        setSaving(false);
        return;
      }
      setCurrentPath(nextPath);
      setSha("");
    }

    const meta: Record<string, unknown> = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      tags: preservedMeta.tags?.length ? preservedMeta.tags : undefined,
      coverImageUrl: preservedMeta.coverImageUrl || undefined,
      status: preservedMeta.status ?? "draft",
      originalCategory: normalizeCategory(category),
      uid: uidRef.current,
      createdAt: createdAtRef.current || now,
      updatedAt: now,
    };

    const requestSlug = stripMdxExtension(nextPath);
    const response = await fetch(
      `/api/articles/${encodeURI(requestSlug)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: nextPath,
          content,
          meta,
          sha: sha || undefined,
          message: `chore: upsert ${nextPath}`,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      setSaveError(text || "保存失败。");
      setSaving(false);
      return;
    }

    const payload = (await response.json()) as {
      path?: string;
      newSha?: string;
    };

    setCurrentPath(payload.path ?? nextPath);
    setSha(payload.newSha ?? "");
    setLastSavedAt(Date.now());
    setHasSaved(true);
    persistDraft({
      title,
      category,
      summary,
      content,
      uid: uidRef.current,
      createdAt: createdAtRef.current,
    });
    setSaving(false);
  };

  const previewPath = resolveDocPath(category, title, baseInfo);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {isNewArticle ? "新建文章" : "编辑文章"}
          </p>
          <h1 className="text-2xl font-semibold">{title || "未命名文章"}</h1>
          {previewPath && (
            <p className="text-muted-foreground text-xs">
              目标路径：{previewPath}
            </p>
          )}
          {lastSavedAt && (
            <p className="text-muted-foreground text-xs">
              已保存于 {new Date(lastSavedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClearDraft}>
            清除本地草稿
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">标题</span>
          <Input
            value={title}
            onChange={(e) => {
              const value = e.target.value;
              setTitle(value);
              persistDraft({ title: value });
            }}
            placeholder="请输入标题"
          />
        </label>

        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">分类</span>
          <Input
            list="category-options"
            value={category}
            onChange={(e) => {
              const value = e.target.value;
              setCategory(value);
              persistDraft({ category: value });
            }}
            placeholder="输入分类目录名"
          />
          {categoryOptions.length > 0 && (
            <datalist id="category-options">
              {categoryOptions.map((item) => (
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
            value={summary}
            onChange={(e) => {
              const value = e.target.value;
              setSummary(value);
              persistDraft({ summary: value });
            }}
            placeholder="填写文章摘要..."
            className="min-h-[120px]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-foreground/80 text-sm font-medium">
            MDX 内容
          </span>
          <div className="bg-background rounded-md border">
            <MDXEditor
              markdown={content}
              onChange={(value: string) => {
                setContent(value);
                persistDraft({ content: value });
              }}
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
