"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Archive,
  ArchiveRestore,
  Edit2,
  FilePlus,
  Search,
  Trash2,
} from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your blog posts, drafts, and archived content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDraftClick}>
            <FilePlus className="mr-2 h-4 w-4" />
            New Draft
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search articles..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-muted-foreground text-sm">
                {selected.size} selected
              </span>
              <div className="bg-border h-4 w-px" />
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => runBulk("archive")}
              >
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => runBulk("unarchive")}
              >
                <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={runBulkDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-card w-full rounded-lg border shadow-sm">
        <div className="border-b px-4 py-2">
          <div className="grid grid-cols-[auto,1fr,100px,140px] items-center gap-4 text-sm font-medium">
            <Checkbox
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="pl-2">Article</span>
            <span>Status</span>
            <span className="text-right">Date</span>
          </div>
        </div>
        <div className="divide-y">
          {filtered.map((item) => (
            <div
              key={item.path}
              className="group hover:bg-muted/50 transition-colors"
            >
              <div className="grid grid-cols-[auto,1fr,100px,140px] items-center gap-4 px-4 py-2">
                <div className="flex items-center">
                  <Checkbox
                    checked={selected.has(item.path)}
                    onChange={() => toggleSelect(item.path)}
                    aria-label={`Select ${item.title}`}
                  />
                </div>
                <div className="min-w-0 pl-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(item.path)}
                      className="cursor-pointer truncate font-medium hover:underline"
                    >
                      {item.title || "Untitled Article"}
                    </button>
                    <span className="text-muted-foreground hidden truncate font-mono text-xs sm:inline-block">
                      /{item.path}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleEditClick(item.path)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-muted-foreground text-[10px]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Badge
                    variant={
                      item.status === "published" ? "default" : "secondary"
                    }
                    className="h-5 px-1.5 text-[10px] capitalize"
                  >
                    {item.status || "draft"}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {item.date}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center gap-2 p-8 text-center text-sm">
              <span className="text-muted-foreground">
                {loading ? "Loading articles..." : "No articles found"}
              </span>
              {!loading && filter && (
                <Button
                  variant="link"
                  onClick={() => setFilter("")}
                  className="h-auto p-0"
                >
                  Clear filter
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-muted-foreground text-xs">
        Showing {filtered.length} of {totalCount} articles
      </div>
    </div>
  );
}
