"use client";

import { type MdxDocument } from "@/lib/api/types";
import {
  type ArticleDraftData,
  useArticleDraftStore,
} from "@/lib/stores/article-draft";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ArticleEditorProps = {
  isNewArticle: boolean;
  initialDoc?: MdxDocument;
};

export type ArticleEditorModel = {
  isNewArticle: boolean;
  title: string;
  category: string;
  summary: string;
  coverImageUrl: string;
  content: string;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
  previewPath: string | null;
  categoryOptions: string[];
};

export type ArticleEditorActions = {
  setTitle: (value: string) => void;
  setCategory: (value: string) => void;
  setSummary: (value: string) => void;
  setCoverImageUrl: (value: string) => void;
  setContent: (value: string) => void;
  clearDraft: () => void;
  save: () => Promise<void>;
};

export type ArticleEditorController = {
  model: ArticleEditorModel;
  actions: ArticleEditorActions;
};

const NEW_DRAFT_KEY = "__draft__/new";
const DRAFT_SYNC_DELAY_MS = 400;

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

export function useArticleEditorController({
  isNewArticle,
  initialDoc,
}: ArticleEditorProps): ArticleEditorController {
  const initialTimestamp = useMemo(() => nowSeconds(), []);
  const basePath = initialDoc?.path ?? "";
  const { category: baseCategoryFromPath, fileStem: baseFileStem } = useMemo(
    () => parsePathParts(basePath),
    [basePath],
  );
  const baseCategory =
    initialDoc?.meta.originalCategory ?? baseCategoryFromPath;

  const baseTitle = initialDoc?.meta.title?.trim() || baseFileStem;
  const baseSummary = initialDoc?.meta.summary ?? "";
  const baseCoverImageUrl = initialDoc?.meta.coverImageUrl ?? "";
  const baseContent = initialDoc?.content ?? "";
  const baseUid = initialDoc?.meta.uid ?? ensureUid();
  const baseCreatedAt = initialDoc?.meta.createdAt ?? initialTimestamp;
  const preservedMeta = useMemo(
    () => ({
      tags: initialDoc?.meta.tags,
      status: initialDoc?.meta.status ?? "draft",
    }),
    [initialDoc],
  );

  const baseInfo = useMemo(
    () => ({
      category: baseCategory,
      title: baseTitle,
      fileStem: baseFileStem,
    }),
    [baseCategory, baseFileStem, baseTitle],
  );

  const baseData = useMemo<ArticleDraftData>(
    () => ({
      title: baseTitle,
      category: baseCategory,
      summary: baseSummary,
      coverImageUrl: baseCoverImageUrl,
      content: baseContent,
      uid: baseUid,
      createdAt: baseCreatedAt,
    }),
    [
      baseTitle,
      baseCategory,
      baseSummary,
      baseCoverImageUrl,
      baseContent,
      baseUid,
      baseCreatedAt,
    ],
  );

  const draftKey = useMemo(
    () => (basePath ? `path:${basePath}` : NEW_DRAFT_KEY),
    [basePath],
  );

  const { drafts, initDraft, updateDraft, commitDraft, clearDraft } =
    useArticleDraftStore();

  const draftEntry = useMemo(() => drafts[draftKey], [draftKey, drafts]);
  const normalizeDraft = useCallback(
    (data?: ArticleDraftData) => ({
      ...baseData,
      ...data,
      coverImageUrl: data?.coverImageUrl ?? baseData.coverImageUrl,
    }),
    [baseData],
  );
  const [draftData, setDraftData] = useState<ArticleDraftData>(
    normalizeDraft(draftEntry?.data),
  );
  const [currentPath, setCurrentPath] = useState(basePath);
  const [sha, setSha] = useState(initialDoc?.sha ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(Boolean(initialDoc));
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const hydratedRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initDraft(draftKey, baseData, {
      sourceUpdatedAt: initialDoc?.meta.updatedAt,
    });
  }, [draftKey, baseData, initDraft, initialDoc?.meta.updatedAt]);

  useEffect(() => {
    hydratedRef.current = false;
  }, [draftKey]);

  useEffect(() => {
    if (!draftEntry || hydratedRef.current) return;
    setDraftData(normalizeDraft(draftEntry.data));
    hydratedRef.current = true;
  }, [draftEntry, normalizeDraft]);

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

  useEffect(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      updateDraft(draftKey, draftData);
    }, DRAFT_SYNC_DELAY_MS);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [draftData, draftKey, updateDraft]);

  const setTitle = useCallback((value: string) => {
    setDraftData((prev) => ({ ...prev, title: value }));
  }, []);

  const setCategory = useCallback((value: string) => {
    setDraftData((prev) => ({ ...prev, category: value }));
  }, []);

  const setSummary = useCallback((value: string) => {
    setDraftData((prev) => ({ ...prev, summary: value }));
  }, []);

  const setCoverImageUrl = useCallback((value: string) => {
    setDraftData((prev) => ({ ...prev, coverImageUrl: value }));
  }, []);

  const setContent = useCallback((value: string) => {
    setDraftData((prev) => ({ ...prev, content: value }));
  }, []);

  const handleClearDraft = useCallback(() => {
    clearDraft(draftKey);
    initDraft(draftKey, baseData, {
      sourceUpdatedAt: initialDoc?.meta.updatedAt,
    });
    setDraftData(baseData);
  }, [baseData, clearDraft, draftKey, initDraft, initialDoc?.meta.updatedAt]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaveError(null);

    const nextPath = resolveDocPath(
      draftData.category,
      draftData.title,
      baseInfo,
    );
    if (!draftData.title.trim()) {
      setSaveError("标题不能为空。");
      return;
    }
    if (!draftData.category.trim()) {
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

    const nextStatus =
      preservedMeta.status === "archived" ? "archived" : "published";
    const meta: Record<string, unknown> = {
      title: draftData.title.trim(),
      summary: draftData.summary.trim() || undefined,
      tags: preservedMeta.tags?.length ? preservedMeta.tags : undefined,
      coverImageUrl: draftData.coverImageUrl.trim() || undefined,
      status: nextStatus,
      originalCategory: normalizeCategory(draftData.category),
      uid: draftData.uid,
      createdAt: draftData.createdAt || now,
      updatedAt: now,
    };

    const response = await fetch("/api/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        v: 1,
        op: "upsert",
        params: {
          path: nextPath,
          previousPath: needsMove ? currentPath : undefined,
          content: draftData.content,
          meta,
          sha: sha || undefined,
          message: `chore: upsert ${nextPath}`,
        },
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      setSaveError(payload.error?.message || "保存失败。");
      setSaving(false);
      return;
    }

    const payload = (await response.json()) as {
      data?: { path?: string; newSha?: string };
    };

    setCurrentPath(payload.data?.path ?? nextPath);
    setSha(payload.data?.newSha ?? "");
    setLastSavedAt(Date.now());
    setHasSaved(true);
    if (isNewArticle) {
      clearDraft(draftKey);
    } else {
      commitDraft(draftKey, draftData);
    }
    setSaving(false);
  }, [
    baseInfo,
    clearDraft,
    commitDraft,
    currentPath,
    draftData,
    draftKey,
    hasSaved,
    isNewArticle,
    preservedMeta.status,
    preservedMeta.tags,
    saving,
    sha,
  ]);

  const previewPath = useMemo(
    () => resolveDocPath(draftData.category, draftData.title, baseInfo),
    [baseInfo, draftData.category, draftData.title],
  );

  return {
    model: {
      isNewArticle,
      title: draftData.title,
      category: draftData.category,
      summary: draftData.summary,
      coverImageUrl: draftData.coverImageUrl,
      content: draftData.content,
      saving,
      saveError,
      lastSavedAt,
      previewPath,
      categoryOptions,
    },
    actions: {
      setTitle,
      setCategory,
      setSummary,
      setCoverImageUrl,
      setContent,
      clearDraft: handleClearDraft,
      save: handleSave,
    },
  };
}
