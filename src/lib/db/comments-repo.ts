import { ReadCache } from "@/lib/cache/read-cache";
import { CachePool } from "@/lib/db/cache-pool";
import { comments, type Comment, type NewComment } from "@/lib/db/schema";
import { requireDb } from "@/lib/util";
import { AppError } from "@/types/error";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { DrizzleDb } from "./d1";

type ArticleFilter = { articleUid?: string; articlePath?: string };
type CommentStatus = Comment["status"];
type VoteDirection = "up" | "down";
type CommentListItem = {
  id: number;
  authorName: string | null;
  content: string;
  createdAt: string;
  parentId: number | null;
  upvotes: number;
  downvotes: number;
};

type CommentListPayload = {
  items: CommentListItem[];
  archivedCount: number;
};

type VoteCounts = { upvotes: number; downvotes: number };
type CommentCacheValue =
  | { kind: "list"; value: CommentListPayload }
  | { kind: "comment"; value: VoteCounts };

type VoteEvent = { id: number; direction: VoteDirection };

const COMMENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const commentsCache = new ReadCache<CommentCacheValue>({
  ttlMs: COMMENTS_CACHE_TTL_MS,
  logPrefix: "comments-cache",
});
const commentToKeys = new Map<number, Set<string>>();
const votePool = new CachePool<VoteEvent>(flushVotes, {
  size: 64,
  ttlMs: 30_000,
});

function buildArticleFilter(
  filter: ArticleFilter,
): ResultAsync<SQL<unknown>, AppError> {
  if (filter.articleUid) {
    return okAsync<SQL<unknown>, AppError>(
      eq(comments.articleUid, filter.articleUid),
    );
  }
  if (filter.articlePath) {
    return okAsync<SQL<unknown>, AppError>(
      eq(comments.articlePath, filter.articlePath),
    );
  }
  return errAsync(
    AppError.invalidRequest("articleUid or articlePath is required"),
  );
}

function dbError(message: string, error: unknown) {
  return AppError.fromUnknown(error, { tag: "DB", message });
}

function cacheKey(filter: ArticleFilter): string | null {
  if (filter.articleUid) return `uid:${filter.articleUid}`;
  if (filter.articlePath) return `path:${filter.articlePath}`;
  return null;
}

function commentKey(id: number): string {
  return `comment:${id}`;
}

function trackCommentKeys(items: CommentListItem[], key: string) {
  items.forEach((item) => {
    const set = commentToKeys.get(item.id) ?? new Set<string>();
    set.add(key);
    commentToKeys.set(item.id, set);
  });
}

function getListCache(key: string): CommentListPayload | null {
  const entry = commentsCache.get(key);
  if (!entry || entry.kind !== "list") return null;
  return entry.value;
}

function setListCache(key: string, payload: CommentListPayload) {
  commentsCache.set(key, { kind: "list", value: payload });
  trackCommentKeys(payload.items, key);
  payload.items.forEach((item) => {
    commentsCache.set(commentKey(item.id), {
      kind: "comment",
      value: { upvotes: item.upvotes, downvotes: item.downvotes },
    });
  });
}

function getCommentCache(id: number): VoteCounts | null {
  const entry = commentsCache.get(commentKey(id));
  if (!entry || entry.kind !== "comment") return null;
  return entry.value;
}

function setCommentCache(id: number, counts: VoteCounts) {
  commentsCache.set(commentKey(id), { kind: "comment", value: counts });
}

function invalidateByIds(ids: number[]) {
  ids.forEach((id) => {
    const keys = commentToKeys.get(id);
    if (!keys) return;
    keys.forEach((key) => commentsCache.invalidate(key));
    commentToKeys.delete(id);
    commentsCache.invalidate(commentKey(id));
  });
}

function invalidateByRefs(
  refs: Array<{ articleUid: string; articlePath: string }>,
) {
  const seen = new Set<string>();
  refs.forEach((ref) => {
    const uidKey = `uid:${ref.articleUid}`;
    const pathKey = `path:${ref.articlePath}`;
    if (!seen.has(uidKey)) {
      seen.add(uidKey);
      commentsCache.invalidate(uidKey);
    }
    if (!seen.has(pathKey)) {
      seen.add(pathKey);
      commentsCache.invalidate(pathKey);
    }
  });
}

function updateVoteInCache(id: number, upvotes: number, downvotes: number) {
  const keys = commentToKeys.get(id);
  if (keys) {
    keys.forEach((key) => {
      const cached = getListCache(key);
      if (!cached) return;
      const nextItems = cached.items.map((item) =>
        item.id === id ? { ...item, upvotes, downvotes } : item,
      );
      setListCache(key, { ...cached, items: nextItems });
    });
  }
  setCommentCache(id, { upvotes, downvotes });
}

async function flushVotes(batch: VoteEvent[]) {
  const db = await requireDb().match(
    (value) => value,
    (error) => {
      throw error;
    },
  );
  const deltas = new Map<number, { up: number; down: number }>();
  for (const event of batch) {
    const current = deltas.get(event.id) ?? { up: 0, down: 0 };
    if (event.direction === "up") {
      current.up += 1;
    } else {
      current.down += 1;
    }
    deltas.set(event.id, current);
  }

  for (const [id, delta] of deltas.entries()) {
    const updates =
      delta.up > 0 && delta.down > 0
        ? {
            upvotes: sql<number>`${comments.upvotes} + ${delta.up}`,
            downvotes: sql<number>`${comments.downvotes} + ${delta.down}`,
          }
        : delta.up > 0
          ? { upvotes: sql<number>`${comments.upvotes} + ${delta.up}` }
          : { downvotes: sql<number>`${comments.downvotes} + ${delta.down}` };
    await db.update(comments).set(updates).where(eq(comments.id, id));
  }
}

export class CommentsRepository {
  constructor(private readonly db: DrizzleDb) {}

  listApproved(filter: ArticleFilter): ResultAsync<Comment[], AppError> {
    return buildArticleFilter(filter).andThen((articleFilter) =>
      ResultAsync.fromPromise(
        this.db
          .select()
          .from(comments)
          .where(and(articleFilter, eq(comments.status, "approved")))
          .orderBy(desc(comments.createdAt)),
        (error) => dbError("Failed to load comments", error),
      ),
    );
  }

  countArchived(filter: ArticleFilter): ResultAsync<number, AppError> {
    return buildArticleFilter(filter).andThen((articleFilter) =>
      ResultAsync.fromPromise(
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(and(articleFilter, eq(comments.status, "archived")))
          .get(),
        (error) => dbError("Failed to load archived comments", error),
      ).map((row) => Number(row?.count ?? 0)),
    );
  }

  listApprovedCached(
    filter: ArticleFilter,
  ): ResultAsync<CommentListPayload, AppError> {
    const key = cacheKey(filter);
    if (key) {
      const cached = getListCache(key);
      if (cached) return okAsync(cached);
    }
    return ResultAsync.combine([
      this.listApproved(filter),
      this.countArchived(filter),
    ]).map(([rows, archivedCount]) => {
      const items: CommentListItem[] = rows.map((row) => ({
        id: row.id,
        authorName: row.authorName ?? null,
        content: row.content,
        createdAt: row.createdAt,
        parentId: row.parentId ?? null,
        upvotes: row.upvotes ?? 0,
        downvotes: row.downvotes ?? 0,
      }));
      const payload = { items, archivedCount };
      if (key) {
        setListCache(key, payload);
      }
      return payload;
    });
  }

  listByStatus(status?: CommentStatus): ResultAsync<Comment[], AppError> {
    const base = this.db.select().from(comments);
    const query = status ? base.where(eq(comments.status, status)) : base;
    return ResultAsync.fromPromise(
      query.orderBy(desc(comments.createdAt)),
      (error) => dbError("Failed to load comments", error),
    );
  }

  insertComment(payload: NewComment): ResultAsync<void, AppError> {
    return ResultAsync.fromPromise(
      this.db.insert(comments).values(payload),
      (error) => dbError("Failed to save comment", error),
    ).map(() => undefined);
  }

  updateStatus(
    ids: number[],
    status: "pending" | "approved" | "archived" | "spam" | "deleted",
    updatedAt: string,
  ): ResultAsync<number, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .update(comments)
        .set({ status, updatedAt })
        .where(inArray(comments.id, ids)),
      (error) => dbError("Failed to update comments", error),
    ).map(() => ids.length);
  }

  deleteByIds(ids: number[]): ResultAsync<number, AppError> {
    return ResultAsync.fromPromise(
      this.db.delete(comments).where(inArray(comments.id, ids)),
      (error) => dbError("Failed to delete comments", error),
    ).map(() => ids.length);
  }

  approveAndInvalidate(
    ids: number[],
    updatedAt: string,
  ): ResultAsync<number, AppError> {
    return this.getArticleRefsByIds(ids).andThen((refs) =>
      this.updateStatus(ids, "approved", updatedAt).map((count) => {
        invalidateByRefs(refs);
        invalidateByIds(ids);
        return count;
      }),
    );
  }

  getArticleRefsByIds(
    ids: number[],
  ): ResultAsync<Array<{ articleUid: string; articlePath: string }>, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .select({
          articleUid: comments.articleUid,
          articlePath: comments.articlePath,
        })
        .from(comments)
        .where(inArray(comments.id, ids)),
      (error) => dbError("Failed to load comment refs", error),
    );
  }

  incrementVote(
    id: number,
    direction: VoteDirection,
  ): ResultAsync<{ upvotes: number; downvotes: number }, AppError> {
    const cached = getCommentCache(id);
    const getCounts = cached
      ? okAsync(cached)
      : ResultAsync.fromPromise(
          this.db
            .select({
              upvotes: comments.upvotes,
              downvotes: comments.downvotes,
            })
            .from(comments)
            .where(eq(comments.id, id))
            .get(),
          (error) => dbError("Failed to read votes", error),
        ).andThen((row) => {
          if (!row) {
            return errAsync(AppError.notFound("Comment not found"));
          }
          return okAsync({
            upvotes: row.upvotes ?? 0,
            downvotes: row.downvotes ?? 0,
          });
        });

    return getCounts.andThen((current) =>
      ResultAsync.fromPromise(
        votePool.add({ id, direction }),
        (error) =>
          AppError.fromUnknown(error, {
            tag: "DB",
            message: "Failed to enqueue vote",
          }),
      ).andThen((result) => {
        if (result.isErr()) {
          return errAsync(result.error);
        }
        const next = {
          upvotes: current.upvotes + (direction === "up" ? 1 : 0),
          downvotes: current.downvotes + (direction === "down" ? 1 : 0),
        };
        updateVoteInCache(id, next.upvotes, next.downvotes);
        return okAsync(next);
      }),
    );
  }
}
