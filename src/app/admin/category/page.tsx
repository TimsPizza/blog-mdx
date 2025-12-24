"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";

type ArticleSummary = {
  path: string;
  title?: string;
};

const DEFAULT_CATEGORY = "default";

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCategory, setDialogCategory] = useState<string | null>(null);
  const [dialogDocs, setDialogDocs] = useState<ArticleSummary[]>([]);

  const categoryList = useMemo(() => {
    const items = categories.map((item) => item.trim()).filter(Boolean);
    if (!items.includes(DEFAULT_CATEGORY)) {
      return [DEFAULT_CATEGORY, ...items];
    }
    return items;
  }, [categories]);

  const refreshCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "加载分类失败");
        return;
      }
      const data = (await res.json()) as { items?: string[] };
      setCategories(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Failed to load categories", err);
      setError("加载分类失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshCategories();
  }, []);

  const handleAddCategory = async () => {
    const name = newCategory.trim().replace(/^\/+|\/+$/g, "");
    if (!name) {
      setError("分类名称不能为空");
      return;
    }
    if (name.includes("/")) {
      setError("分类只能是单级目录");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "创建分类失败");
        return;
      }
      setNewCategory("");
      await refreshCategories();
    } catch (err) {
      console.error("Failed to create category", err);
      setError("创建分类失败");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = async (category: string) => {
    setDialogCategory(category);
    setDialogOpen(true);
    setDialogDocs([]);
    setError(null);
    try {
      const res = await fetch(
        `/api/articles?category=${encodeURIComponent(category)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { items?: ArticleSummary[] };
      setDialogDocs(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Failed to fetch category docs", err);
    }
  };

  const handleDeleteCategory = async (mode: "delete" | "move") => {
    if (!dialogCategory) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dialogCategory, mode }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "删除分类失败");
        return;
      }
      setDialogOpen(false);
      setDialogCategory(null);
      setDialogDocs([]);
      await refreshCategories();
    } catch (err) {
      console.error("Failed to delete category", err);
      setError("删除分类失败");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">分类管理</h1>
          <p className="text-muted-foreground text-sm">
            默认分类 {DEFAULT_CATEGORY} 不可删除
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="新增分类，例如 tutorials"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <Button onClick={handleAddCategory} disabled={actionLoading}>
          添加分类
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <div className="text-muted-foreground grid grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-2 text-sm font-medium">
          <span>分类</span>
          <span className="text-right">操作</span>
        </div>
        <div className="divide-y">
          {categoryList.map((category) => (
            <div
              key={category}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
            >
              <div className="text-sm font-medium">{category}</div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    category === DEFAULT_CATEGORY || actionLoading || loading
                  }
                  onClick={() => openDeleteDialog(category)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
          {!loading && categoryList.length === 0 && (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              暂无分类
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="bg-background fixed left-1/2 top-1/2 w-[min(640px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              删除分类 {dialogCategory}
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground mt-2 text-sm">
              该分类下存在 {dialogDocs.length} 篇文档。
            </Dialog.Description>

            {dialogDocs.length > 0 && (
              <div className="mt-4 max-h-48 overflow-auto rounded-md border p-3 text-sm">
                <ul className="space-y-2">
                  {dialogDocs.map((doc) => (
                    <li key={doc.path} className="text-muted-foreground">
                      {doc.title ? `${doc.title} (${doc.path})` : doc.path}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={actionLoading}
              >
                取消
              </Button>
              {dialogDocs.length > 0 ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeleteCategory("move")}
                    disabled={actionLoading}
                  >
                    移动到 {DEFAULT_CATEGORY}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteCategory("delete")}
                    disabled={actionLoading}
                  >
                    删除文档并移除分类
                  </Button>
                </>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteCategory("delete")}
                  disabled={actionLoading}
                >
                  删除分类
                </Button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
