import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articlePath: text("article_path").notNull(),
    articleUid: text("article_uid").notNull(),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    content: text("content").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    status: text("status", {
      enum: ["pending", "approved", "archived", "spam", "deleted"],
    })
      .notNull()
      .default("pending"),
    parentId: integer("parent_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("comments_path_idx").on(table.articlePath),
    index("comments_uid_idx").on(table.articleUid),
    index("comments_path_status_idx").on(table.articlePath, table.status),
    index("comments_parent_idx").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "comments_parent_fk",
    }).onDelete("cascade"),
  ],
);

export const sessions = sqliteTable("sessions", {
  session_token: text("session_token").primaryKey(),
  user_id: text("user_id").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const visits = sqliteTable(
  "visits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articlePath: text("article_path").notNull(),
    articleUid: text("article_uid").notNull(),
    ip: text("ip"),
    ua: text("ua"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("visits_path_idx").on(table.articlePath),
    index("visits_uid_idx").on(table.articleUid),
  ],
);

export const logs = sqliteTable(
  "logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    level: text("level", { enum: ["info", "warn", "error"] }).notNull(),
    message: text("message").notNull(),
    meta: text("meta").notNull().default("{}"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [index("logs_level_idx").on(table.level)],
);

export const newsletter_subscribers = sqliteTable(
  "newsletter_subscribers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    status: text("status", {
      enum: ["active", "unsubscribed"],
    })
      .notNull()
      .default("active"),
    source: text("source"),
    ip: text("ip"),
    user_agent: text("user_agent"),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_email_idx").on(table.email),
    index("newsletter_created_at_idx").on(table.created_at),
  ],
);

export const newsletter_queue = sqliteTable(
  "newsletter_queue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    article_uid: text("article_uid").notNull(),
    article_path: text("article_path").notNull(),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    sent_at: integer("sent_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("newsletter_queue_uid_idx").on(table.article_uid),
    index("newsletter_queue_sent_idx").on(table.sent_at),
  ],
);

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
export type NewsletterSubscriber = InferSelectModel<
  typeof newsletter_subscribers
>;
export type NewNewsletterSubscriber = InferInsertModel<
  typeof newsletter_subscribers
>;
export type NewsletterQueueItem = InferSelectModel<typeof newsletter_queue>;
export type NewNewsletterQueueItem = InferInsertModel<typeof newsletter_queue>;
