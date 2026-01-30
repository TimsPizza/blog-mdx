"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";

type AdminCommentItem = {
  id: number;
  articleUid: string;
  articlePath: string;
  authorName: string | null;
  authorEmail: string | null;
  content: string;
  status: string;
  createdAt: string;
};

const STATUS_OPTIONS = ["all", "pending", "approved", "archived"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function CommentsAdmin() {
  const [items, setItems] = useState<AdminCommentItem[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async (nextStatus = status) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus !== "all") params.set("status", nextStatus);
      const res = await fetch(`/api/admin/comments?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to load comments.");
        return;
      }
      const data = (await res.json()) as {
        data?: { items?: AdminCommentItem[] };
      };
      setItems(Array.isArray(data.data?.items) ? (data.data?.items ?? []) : []);
    } catch (err) {
      console.error("Failed to load comments", err);
      setError("Failed to load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchComments(status);
  }, [status]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.articlePath.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.authorName ?? "").toLowerCase().includes(q) ||
        (item.authorEmail ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const runAction = async (action: string, ids: number[]) => {
    if (ids.length === 0) return;
    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete ${ids.length} comment(s)? This cannot be undone.`,
      );
      if (!confirmed) return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Action failed.");
        return;
      }
      await fetchComments(status);
    } catch (err) {
      console.error("Comment action failed", err);
      setError("Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Comments</h1>
          <p className="text-muted-foreground text-sm">
            Approve, archive, or delete comments.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={status === option ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus(option)}
              disabled={loading || actionLoading}
            >
              {option}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search comments..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-55"
        />
        {loading && (
          <span className="text-muted-foreground text-sm">Loading...</span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <div className="text-muted-foreground grid grid-cols-[1fr,160px,140px] items-center gap-4 border-b px-4 py-2 text-sm font-medium">
          <span>Comment</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr,160px,140px] items-start gap-4 px-4 py-3"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {item.authorName ?? "Anonymous"}
                  {item.authorEmail ? ` | ${item.authorEmail}` : ""}
                </div>
                <div className="text-muted-foreground text-xs">
                  {item.articlePath}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatDate(item.createdAt)}
                </div>
                <p className="text-sm">{item.content}</p>
              </div>
              <div className="text-muted-foreground text-sm">{item.status}</div>
              <div className="flex flex-col items-end gap-2">
                {item.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => runAction("approve", [item.id])}
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                )}
                {item.status !== "archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runAction("archive", [item.id])}
                    disabled={actionLoading}
                  >
                    Archive
                  </Button>
                )}
                {item.status === "archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runAction("unarchive", [item.id])}
                    disabled={actionLoading}
                  >
                    Unarchive
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => runAction("delete", [item.id])}
                  disabled={actionLoading}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              No comments found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
