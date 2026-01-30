import {
  newsletter_subscribers,
  type NewNewsletterSubscriber,
  type NewsletterSubscriber,
} from "@/lib/db/schema";
import { AppError } from "@/types/error";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import type { DrizzleDb } from "./d1";

function dbError(message: string, error: unknown) {
  return AppError.fromUnknown(error, { tag: "DB", message });
}

export class SubscribersRepository {
  constructor(private readonly db: DrizzleDb) {}

  list(status?: "active" | "unsubscribed"): ResultAsync<
    NewsletterSubscriber[],
    AppError
  > {
    const base = this.db.select().from(newsletter_subscribers);
    const query = status
      ? base.where(eq(newsletter_subscribers.status, status))
      : base;
    return ResultAsync.fromPromise(
      query.orderBy(desc(newsletter_subscribers.created_at)),
      (error) => dbError("Failed to load subscribers", error),
    );
  }

  findByEmail(email: string): ResultAsync<NewsletterSubscriber | undefined, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .select()
        .from(newsletter_subscribers)
        .where(eq(newsletter_subscribers.email, email))
        .get(),
      (error) => dbError("Failed to read subscriber", error),
    );
  }

  countSince(since: Date): ResultAsync<number, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(newsletter_subscribers)
        .where(gte(newsletter_subscribers.created_at, since))
        .get(),
      (error) => dbError("Failed to check rate limit", error),
    ).map((row) => Number(row?.count ?? 0));
  }

  updateByEmail(
    email: string,
    payload: Partial<NewNewsletterSubscriber>,
  ): ResultAsync<void, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .update(newsletter_subscribers)
        .set(payload)
        .where(eq(newsletter_subscribers.email, email)),
      (error) => dbError("Failed to update subscriber", error),
    ).map(() => undefined);
  }

  insert(payload: NewNewsletterSubscriber): ResultAsync<void, AppError> {
    return ResultAsync.fromPromise(
      this.db.insert(newsletter_subscribers).values(payload),
      (error) => dbError("Failed to save subscriber", error),
    ).map(() => undefined);
  }

  updateStatusByIds(
    ids: number[],
    status: "active" | "unsubscribed",
    updatedAt: Date,
  ): ResultAsync<number, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .update(newsletter_subscribers)
        .set({ status, updated_at: updatedAt })
        .where(inArray(newsletter_subscribers.id, ids)),
      (error) => dbError("Failed to update subscribers", error),
    ).map(() => ids.length);
  }

  deleteByIds(ids: number[]): ResultAsync<number, AppError> {
    return ResultAsync.fromPromise(
      this.db
        .delete(newsletter_subscribers)
        .where(inArray(newsletter_subscribers.id, ids)),
      (error) => dbError("Failed to delete subscribers", error),
    ).map(() => ids.length);
  }
}
