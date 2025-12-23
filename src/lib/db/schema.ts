import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    content: text("content").notNull(),
    status: text("status", {
      enum: ["pending", "approved", "spam", "deleted"],
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
    index("comments_slug_idx").on(table.slug),
    index("comments_slug_status_idx").on(table.slug, table.status),
    index("comments_parent_idx").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "comments_parent_fk",
    }).onDelete("cascade"),
  ],
);

export const views = sqliteTable("views", {
  slug: text("slug").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const sessions = sqliteTable("sessions", {
  session_token: text("session_token").primaryKey(),
  user_id: text("user_id").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const visits = sqliteTable(
  "visits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    ip: text("ip"),
    ua: text("ua"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [index("visits_slug_idx").on(table.slug)],
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

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
