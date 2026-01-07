"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type ArticleListItem = {
  path: string;
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
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!filter.trim()) return articles;
    const q = filter.toLowerCase();
    return articles.filter(
      (a) =>
        a.path.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [articles, filter]);

  const toggleSelect = (articleFullPath: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(articleFullPath)) next.delete(articleFullPath);
      else next.add(articleFullPath);
      return next;
    });
  };

  const allSelected = selected.size === filtered.length && filtered.length > 0;
  const toggleSelectAll = () => {
    setSelected(() => {
      if (allSelected) return new Set();
      return new Set(filtered.map((a) => a.path));
    });
  };

  const refreshList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          v: 1,
          op: "list",
          params: {},
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          data?: { items?: ArticleListItem[] };
        };
        setArticles(data.data?.items ?? []);
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
          fetch("/api/article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              v: 1,
              op,
              params: {
                path: slug,
                message: `chore: ${op} ${slug}`,
              },
            }),
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

  const runBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `确认删除 ${selected.size} 篇文章？此操作不可恢复。`,
    );
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((slug) =>
          fetch("/api/article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              v: 1,
              op: "delete",
              params: {
                path: slug,
                message: `chore: delete ${slug}`,
              },
            }),
          }),
        ),
      );
      setSelected(new Set());
      await refreshList();
    } catch (err) {
      console.error("Bulk delete failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (path: string) => {
    router.push(`/admin/article/edit/${encodeURI(path)}`);
  };

  const handleDraftClick = () => {
    router.push(`/admin/article/new`);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">文章管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDraftClick}>
            Draft
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
          <Button
            variant="destructive"
            disabled={selected.size === 0 || actionLoading}
            onClick={runBulkDelete}
          >
            Delete
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
              key={item.path}
              className="grid grid-cols-[auto,1fr,auto,auto] items-center gap-4 px-4 py-3"
            >
              <Checkbox
                checked={selected.has(item.path)}
                onChange={() => toggleSelect(item.path)}
              />
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleEditClick(item.path)}
                  className="text-foreground text-left text-sm font-medium hover:underline"
                >
                  {item.title || item.path}
                </button>
                <div className="text-muted-foreground text-xs">{item.path}</div>
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
    </div>
  );
}
