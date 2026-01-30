import { siteConfig } from "@/components/nav/nav.config";
import { NewsletterQueueRepository } from "@/lib/db/newsletter-queue-repo";
import { SubscribersRepository } from "@/lib/db/subscribers-repo";
import { getContentStore } from "@/lib/server/content-store";
import { requireDb } from "@/lib/util";
import { AppError } from "@/types/error";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

type MailgunConfig = {
  apiKey: string;
  domain: string;
  from: string;
  apiBase: string;
};

type QueuedArticle = {
  id: number;
  article_uid: string;
  article_path: string;
};

export type NewsletterSendResult = {
  queued: number;
  sent: number;
  skipped: number;
  skippedNotFound: number;
  skippedNotPublished: number;
  recipients: number;
};

const normalizeBaseUrl = () => {
  const fromEnv =
    process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? siteConfig.site_domain;
  return fromEnv?.replace(/\/+$/, "") || "http://localhost:3000";
};

const getMailgunConfig = (): ResultAsync<MailgunConfig, AppError> => {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const apiBase =
    process.env.MAILGUN_API_BASE?.replace(/\/+$/, "") ??
    "https://api.mailgun.net/v3";
  if (!apiKey || !domain) {
    return errAsync(
      new AppError({
        code: "INTERNAL",
        message: "MAILGUN_API_KEY and MAILGUN_DOMAIN are required",
        tag: "ENV",
        expose: false,
      }),
    );
  }
  const fromRaw = process.env.MAILGUN_FROM;
  const from =
    typeof fromRaw === "string" && fromRaw.trim()
      ? fromRaw.trim()
      : `no-reply@${domain}`;
  return okAsync({ apiKey, domain, apiBase, from });
};

const stripMdxExtension = (path: string) => path.replace(/\.mdx?$/i, "");

const buildEmailContent = (
  baseUrl: string,
  docs: Array<{ title: string; summary: string; path: string }>,
) => {
  const textLines = docs.map((doc) => {
    const link = `${baseUrl}/posts/${stripMdxExtension(doc.path)}`;
    return `- ${doc.title}\n  ${doc.summary}\n  ${link}`;
  });

  const htmlItems = docs
    .map((doc) => {
      const link = `${baseUrl}/posts/${stripMdxExtension(doc.path)}`;
      return `<li><a href="${link}">${doc.title}</a><p>${doc.summary}</p></li>`;
    })
    .join("");

  return {
    subject: `New posts (${docs.length})`,
    text: `New posts:\n\n${textLines.join("\n\n")}`,
    html: `<p>New posts:</p><ul>${htmlItems}</ul>`,
  };
};

const sendMailgunMessage = (
  config: MailgunConfig,
  payload: {
    to: string[];
    subject: string;
    text: string;
    html: string;
  },
): ResultAsync<void, AppError> => {
  const auth = Buffer.from(`api:${config.apiKey}`, "utf8").toString("base64");
  const url = `${config.apiBase}/${config.domain}/messages`;
  const body = new URLSearchParams({
    from: config.from,
    to: payload.to.join(","),
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return ResultAsync.fromPromise(
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }),
    (error) =>
      AppError.fromUnknown(error, {
        tag: "FETCH",
        message: `Mailgun request failed: ${error instanceof Error ? error.message : String(error)}`,
      }),
  ).andThen((response) => {
    if (response.ok) {
      console.info("[mailgun] send ok", {
        recipients: payload.to.length,
      });
      return okAsync(undefined);
    }
    return ResultAsync.fromPromise(response.text(), (error) =>
      AppError.fromUnknown(error, {
        tag: "FETCH",
        message: "Mailgun response parse failed",
      }),
    ).andThen((bodyText) => {
      console.error("[mailgun] send error", {
        status: response.status,
        body: bodyText,
      });
      return errAsync(
        new AppError({
          code: "INTERNAL",
          message: `Mailgun error: ${response.status}`,
          tag: "FETCH",
          expose: true,
          details: { status: response.status, body: bodyText },
        }),
      );
    });
  });
};

export const enqueueArticleForNewsletter = (input: {
  articleUid: string;
  articlePath: string;
}): ResultAsync<void, AppError> =>
  requireDb().andThen((db) => {
    const repo = new NewsletterQueueRepository(db);
    return repo.enqueue({
      article_uid: input.articleUid,
      article_path: input.articlePath,
      created_at: new Date(),
      sent_at: null,
    });
  });

export const sendQueuedNewsletter = (): ResultAsync<
  NewsletterSendResult,
  AppError
> =>
  requireDb().andThen((db) => {
    const queueRepo = new NewsletterQueueRepository(db);
    const subscriberRepo = new SubscribersRepository(db);

    return queueRepo.listPending().andThen((queue) => {
      const queued = queue.length;
      console.info("[newsletter] pending queue", { queued });
      if (queued === 0) {
        return okAsync({
          queued: 0,
          sent: 0,
          skipped: 0,
          skippedNotFound: 0,
          skippedNotPublished: 0,
          recipients: 0,
        });
      }
      return subscriberRepo.list("active").andThen((subscribers) => {
        const recipients = subscribers.map((item) => item.email);
        console.info("[newsletter] active subscribers", {
          recipients: recipients.length,
        });
        if (recipients.length === 0) {
          return okAsync({
            queued,
            sent: 0,
            skipped: queued,
            skippedNotFound: 0,
            skippedNotPublished: queued,
            recipients: 0,
          });
        }

        return getContentStore().match(
          (store) => {
            const fetches = queue.map((entry) =>
              store
                .getDoc(entry.article_path)
                .map((doc) => ({ entry, doc }))
                .orElse((error) => {
                  if (error.code === "NOT_FOUND") {
                    return okAsync({
                      entry,
                      doc: null,
                      skipReason: "not_found",
                    });
                  }
                  return errAsync(error);
                }),
            );

            return ResultAsync.combine(fetches).andThen((results) => {
              const publishedDocs: Array<{
                entry: QueuedArticle;
                doc: { title: string; summary: string; path: string };
              }> = [];
              let skippedNotFound = 0;
              let skippedNotPublished = 0;

              for (const result of results) {
                if (!result.doc) {
                  skippedNotFound += 1;
                  continue;
                }
                if (result.doc.meta.status !== "published") {
                  skippedNotPublished += 1;
                  continue;
                }
                publishedDocs.push({
                  entry: result.entry,
                  doc: {
                    title: result.doc.meta.title ?? result.doc.path,
                    summary:
                      result.doc.meta.summary ??
                      result.doc.content.slice(0, 160),
                    path: result.doc.path,
                  },
                });
              }

              if (publishedDocs.length === 0) {
                const skipped = skippedNotFound + skippedNotPublished;
                console.info("[newsletter] no published docs", {
                  queued,
                  skippedNotFound,
                  skippedNotPublished,
                });
                return okAsync({
                  queued,
                  sent: 0,
                  skipped,
                  skippedNotFound,
                  skippedNotPublished,
                  recipients: recipients.length,
                });
              }

              return getMailgunConfig()
                .andThen((config) => {
                  const baseUrl = normalizeBaseUrl();
                  const content = buildEmailContent(
                    baseUrl,
                    publishedDocs.map((item) => item.doc),
                  );
                  console.info("[newsletter] send payload", {
                    domain: config.domain,
                    from: config.from,
                    to: recipients.join(", "),
                    baseUrl,
                    posts: publishedDocs.length,
                    recipients: recipients.length,
                  });
                  return sendMailgunMessage(config, {
                    to: recipients,
                    subject: content.subject,
                    text: content.text,
                    html: content.html,
                  });
                })
                .andThen(() =>
                  queueRepo
                    .markSent(
                      publishedDocs.map((item) => item.entry.id),
                      new Date(),
                    )
                    .map((sent) => ({
                      queued,
                      sent,
                      skipped: skippedNotFound + skippedNotPublished,
                      skippedNotFound,
                      skippedNotPublished,
                      recipients: recipients.length,
                    })),
                );
            });
          },
          (error) => errAsync(error),
        );
      });
    });
  });
