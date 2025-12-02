"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type ArticleListItem = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  categories?: string[];
  status?: string;
};

export default function ArticleAdminClient({
  initialItems,
  totalCount,
}: {
  initialItems: ArticleListItem[];
  totalCount: number;
}) {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleListItem[]>(initialItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftSlug, setDraftSlug] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!filter.trim()) return articles;
    const q = filter.toLowerCase();
    return articles.filter(
      (a) =>
        a.slug.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [articles, filter]);

  const toggleSelect = (slug: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const allSelected = selected.size === filtered.length && filtered.length > 0;
  const toggleSelectAll = () => {
    setSelected(() => {
      if (allSelected) return new Set();
      return new Set(filtered.map((a) => a.slug));
    });
  };

  const refreshList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/articles", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items?: ArticleListItem[] };
        setArticles(data.items ?? []);
      }
    } catch (err) {
      console.error("Failed to refresh articles", err);
    } finally {
      setLoading(false);
    }
  };

  const runBulk = async (op: "archive" | "unarchive") => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((slug) =>
          fetch(`/api/articles/${encodeURIComponent(slug)}/${op}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `chore: ${op} ${slug}` }),
          }),
        ),
      );
      setSelected(new Set());
      await refreshList();
    } catch (err) {
      console.error(`Bulk ${op} failed`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = () => {
    if (!draftSlug.trim()) return;
    const slug = draftSlug.trim();
    setDialogOpen(false);
    setDraftSlug("");
    router.push(`/admin/article/edit/${encodeURIComponent(slug)}`);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">文章管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Draft（新建）
          </Button>
          <Button
            variant="outline"
            disabled={selected.size === 0 || actionLoading}
            onClick={() => runBulk("archive")}
          >
            Archive
          </Button>
          <Button
            variant="outline"
            disabled={selected.size === 0 || actionLoading}
            onClick={() => runBulk("unarchive")}
          >
            Unarchive
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索 slug / title / tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {loading && (
          <span className="text-muted-foreground text-sm">加载中…</span>
        )}
        {!loading && (
          <span className="text-muted-foreground text-sm">
            {filtered.length} / {totalCount} 篇
          </span>
        )}
      </div>

      <div className="rounded-md border">
        <div className="text-muted-foreground grid grid-cols-[auto,1fr,auto,auto] items-center gap-4 border-b px-4 py-2 text-sm font-medium">
          <Checkbox checked={allSelected} onChange={toggleSelectAll} />
          <span>标题 / Slug</span>
          <span>状态</span>
          <span className="text-right">日期</span>
        </div>
        <div className="divide-y">
          {filtered.map((item) => (
            <div
              key={item.slug}
              className="grid grid-cols-[auto,1fr,auto,auto] items-center gap-4 px-4 py-3"
            >
              <Checkbox
                checked={selected.has(item.slug)}
                onChange={() => toggleSelect(item.slug)}
              />
              <div className="space-y-1">
                <div className="text-foreground text-sm font-medium">
                  {item.title || item.slug}
                </div>
                <div className="text-muted-foreground text-xs">{item.slug}</div>
                {item.tags && item.tags.length > 0 && (
                  <div className="text-muted-foreground text-xs">
                    Tags: {item.tags.join(", ")}
                  </div>
                )}
              </div>
              <span className="text-muted-foreground text-sm">
                {item.status ?? "draft"}
              </span>
              <span className="text-muted-foreground text-right text-sm">
                {new Date(item.date).toLocaleDateString()}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              {loading ? "加载中…" : "暂无数据"}
            </div>
          )}
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background w-full max-w-md rounded-lg p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">新建草稿</h2>
            <Input
              autoFocus
              placeholder="例如 posts/hello-world.mdx"
              value={draftSlug}
              onChange={(e) => setDraftSlug(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={!draftSlug.trim()}>
                确认
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
