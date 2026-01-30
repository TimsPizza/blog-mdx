"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useEffect, useState } from "react";

type CommentItem = {
  id: number;
  authorName: string | null;
  content: string;
  createdAt: string;
  parentId: number | null;
  upvotes: number;
  downvotes: number;
};
type CommentNode = CommentItem & { replies: CommentNode[] };

type CommentsResponse = {
  ok: true;
  data: {
    items: CommentItem[];
    archivedCount: number;
  };
};

type SubmitResponse = {
  ok: true;
  data: {
    status: "pending";
  };
};

type CommentsSectionProps = {
  articleUid?: string;
  articlePath?: string;
};

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

export function CommentsSection({
  articleUid,
  articlePath,
}: CommentsSectionProps) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const canSubmit = Boolean(
    articleUid && articlePath && content.trim().length > 0,
  );
  const canReply = Boolean(
    articleUid && articlePath && replyingToId && replyContent.trim().length > 0,
  );

  const fetchComments = async () => {
    if (!articleUid && !articlePath) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (articleUid) params.set("articleUid", articleUid);
      if (articlePath) params.set("articlePath", articlePath);
      const res = await fetch(`/api/comments?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Failed to load comments.");
        return;
      }
      const data = (await res.json()) as CommentsResponse;
      setItems(Array.isArray(data.data?.items) ? data.data.items : []);
      setArchivedCount(Number(data.data?.archivedCount ?? 0));
    } catch (err) {
      console.error("Failed to load comments", err);
      setError("Failed to load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchComments();
  }, [articleUid, articlePath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUid,
          articlePath,
          content: content.trim(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to submit comment.");
        return;
      }
      const data = (await res.json()) as SubmitResponse;
      if (data.ok) {
        setNotice("Thanks! Your comment is pending approval.");
        setContent("");
      }
    } catch (err) {
      console.error("Failed to submit comment", err);
      setError("Failed to submit comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: number, direction: "up" | "down") => {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/comments/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to submit vote.");
        return;
      }
      const data = (await res.json()) as {
        data?: { id?: number; upvotes?: number; downvotes?: number };
      };
      const nextId = data.data?.id ?? id;
      const upvotes = data.data?.upvotes ?? 0;
      const downvotes = data.data?.downvotes ?? 0;
      setItems((prev) =>
        prev.map((item) =>
          item.id === nextId ? { ...item, upvotes, downvotes } : item,
        ),
      );
    } catch (err) {
      console.error("Failed to submit vote", err);
      setError("Failed to submit vote.");
    }
  };

  const startReply = (id: number) => {
    setReplyingToId(id);
    setReplyContent("");
    setNotice(null);
    setError(null);
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setReplyContent("");
  };

  const handleReplySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReply || !replyingToId) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUid,
          articlePath,
          content: replyContent.trim(),
          parentId: replyingToId,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to submit reply.");
        return;
      }
      const data = (await res.json()) as SubmitResponse;
      if (data.ok) {
        setNotice("Thanks! Your reply is pending approval.");
        setReplyContent("");
        setReplyingToId(null);
      }
    } catch (err) {
      console.error("Failed to submit reply", err);
      setError("Failed to submit reply.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!articleUid || !articlePath) {
    return null;
  }

  const tree = buildTree(items);

  return (
    <section className="mt-12 space-y-6 border-t pt-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Comments</h2>
        <p className="text-muted-foreground text-sm">
          Share your thoughts below.
        </p>
      </div>

      {archivedCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          comments archived by timspizza
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="space-y-3">
        {loading && (
          <div className="text-muted-foreground text-sm">Loading...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-muted-foreground text-sm">No comments yet.</div>
        )}
        {tree.map((item) => (
          <CommentCard
            key={item.id}
            item={item}
            onReply={startReply}
            onVote={handleVote}
            replyingToId={replyingToId}
            replyContent={replyContent}
            onReplyContentChange={setReplyContent}
            onReplyCancel={cancelReply}
            onReplySubmit={handleReplySubmit}
            submitting={submitting}
            canReply={canReply}
          />
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Textarea
          placeholder="Write a comment..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Submitting..." : "Post comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function buildTree(items: CommentItem[]): CommentNode[] {
  const nodes = items.map((item) => ({
    ...item,
    replies: [] as CommentNode[],
  }));
  const map = new Map<number, CommentNode>(
    nodes.map((node) => [node.id, node]),
  );
  const roots: CommentNode[] = [];
  for (const node of nodes) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CommentCard({
  item,
  onReply,
  onVote,
  replyingToId,
  replyContent,
  onReplyContentChange,
  onReplyCancel,
  onReplySubmit,
  submitting,
  canReply,
}: {
  item: CommentNode;
  onReply: (id: number) => void;
  onVote: (id: number, direction: "up" | "down") => void;
  replyingToId: number | null;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  onReplyCancel: () => void;
  onReplySubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  canReply: boolean;
  depth?: number;
}) {
  const isReplying = replyingToId === item.id;
  const hasReplies = item.replies.length > 0;

  return (
    <div className="flex w-full gap-3">
      <div className="flex flex-col items-center">
        <div className="bg-muted border-border text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
          <User className="h-4 w-4" />
        </div>
        <div className="bg-border my-2 w-px flex-1" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-sm">
          <div className="text-muted-foreground flex flex-row items-center justify-start gap-2 text-xs">
            <span className="text-foreground font-medium">
              {item.authorName || "Anonymous"}
            </span>
            <span>•</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>

          <div className="mt-1">
            <p className="leading-relaxed whitespace-pre-wrap">
              {item.content}
            </p>
          </div>

          <div className="text-muted-foreground mt-2 flex flex-row items-center justify-start gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-foreground h-auto p-0 hover:bg-transparent"
              onClick={() => onVote(item.id, "up")}
            >
              <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
              <span>{item.upvotes}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="hover:text-foreground h-auto p-0 hover:bg-transparent"
              onClick={() => onVote(item.id, "down")}
            >
              <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
              <span>{item.downvotes}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="hover:text-foreground h-auto p-0 hover:bg-transparent"
              onClick={() => onReply(item.id)}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Reply
            </Button>
          </div>
        </div>

        {isReplying && (
          <form className="mt-2 space-y-2" onSubmit={onReplySubmit}>
            <Textarea
              autoFocus
              placeholder="What are your thoughts?"
              value={replyContent}
              onChange={(event) => onReplyContentChange(event.target.value)}
              required
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReplyCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!canReply || submitting}
              >
                {submitting ? "Submitting..." : "Reply"}
              </Button>
            </div>
          </form>
        )}

        {hasReplies && (
          <div className="mt-2 space-y-2">
            {item.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                item={reply}
                onReply={onReply}
                onVote={onVote}
                replyingToId={replyingToId}
                replyContent={replyContent}
                onReplyContentChange={onReplyContentChange}
                onReplyCancel={onReplyCancel}
                onReplySubmit={onReplySubmit}
                submitting={submitting}
                canReply={canReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
