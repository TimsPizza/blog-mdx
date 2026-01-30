import {
  newsletter_queue,
  type NewsletterQueueItem,
  type NewNewsletterQueueItem,
} from "@/lib/db/schema";
import { AppError } from "@/types/error";
import { asc, inArray, isNull } from "drizzle-orm";
import { okAsync, ResultAsync } from "neverthrow";
import type { DrizzleDb } from "./d1";

function dbError(message: string, error: unknown) {
  return AppError.fromUnknown(error, { tag: "DB", message });
}

export class NewsletterQueueRepository {
  constructor(private readonly db: DrizzleDb) {}

  listPending(): ResultAsync<NewsletterQueueItem[], AppError> {
    return ResultAsync.fromPromise(
      this.db
        .select()
        .from(newsletter_queue)
        .where(isNull(newsletter_queue.sent_at))
        .orderBy(asc(newsletter_queue.created_at)),
      (error) => dbError("Failed to load newsletter queue", error),
    );
  }

  enqueue(payload: NewNewsletterQueueItem): ResultAsync<void, AppError> {
    return ResultAsync.fromPromise(
      this.db.insert(newsletter_queue).values(payload).onConflictDoNothing(),
      (error) => dbError("Failed to enqueue newsletter", error),
    ).map(() => undefined);
  }

  markSent(ids: number[], sentAt: Date): ResultAsync<number, AppError> {
    if (ids.length === 0) {
      return okAsync(0);
    }
    return ResultAsync.fromPromise(
      this.db
        .update(newsletter_queue)
        .set({ sent_at: sentAt })
        .where(inArray(newsletter_queue.id, ids)),
      (error) => dbError("Failed to update newsletter queue", error),
    ).map(() => ids.length);
  }
}
