import { requireAdminResult } from "@/lib/server/admin-auth";
import { getContentStore, listDocuments } from "@/lib/server/content-store";
import { enqueueArticleForNewsletter } from "@/lib/server/newsletter";
import { mapDocToPost } from "@/lib/server/posts";
import { AppError } from "@/types/error";
import { err, errAsync, okAsync, ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";

type ArticleOp = "get" | "upsert" | "delete" | "archive" | "unarchive" | "list";

type ArticleRequest = {
  v: number;
  op: ArticleOp;
  idempotencyKey?: string;
  params?: Record<string, unknown>;
};

type ArticleResponse<Data = unknown> = {
  ok: true;
  data: Data;
  meta: { requestId: string };
};

type ArticleErrorResponse = {
  ok: false;
  error: { code: string; message: string };
  meta: { requestId: string };
};

const ARTICLE_OPS: ArticleOp[] = [
  "get",
  "upsert",
  "delete",
  "archive",
  "unarchive",
  "list",
];
const MUTATING_OPS = new Set<ArticleOp>([
  "upsert",
  "delete",
  "archive",
  "unarchive",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const isArticleOp = (value: string): value is ArticleOp =>
  ARTICLE_OPS.includes(value as ArticleOp);

const respondOk = <Data>(
  requestId: string,
  data: Data,
): NextResponse<ArticleResponse<Data>> =>
  NextResponse.json({ ok: true, data, meta: { requestId } });

const respondError = (
  requestId: string,
  error: AppError,
  context?: { op?: string },
): NextResponse<ArticleErrorResponse> => (
  console.error("[api/article]", {
    requestId,
    op: context?.op,
    code: error.code,
    message: error.message,
    tag: error.tag,
    status: error.status,
  }),
  NextResponse.json(
    { ok: false, error: error.publicPayload(), meta: { requestId } },
    { status: error.status },
  )
);

const parseRequest = (
  payload: unknown,
): ResultAsync<ArticleRequest, AppError> => {
  if (!isRecord(payload)) {
    return errAsync(AppError.invalidRequest("Invalid request payload"));
  }
  const v = Number(payload.v);
  const op = stringValue(payload.op);
  if (v !== 1 || !op) {
    return errAsync(AppError.invalidRequest("Invalid request envelope"));
  }
  if (!isArticleOp(op)) {
    return errAsync(AppError.invalidRequest("Unsupported operation"));
  }
  return okAsync({
    v,
    op,
    idempotencyKey: stringValue(payload.idempotencyKey),
    params: isRecord(payload.params) ? payload.params : undefined,
  });
};

const normalizeParams = (request: ArticleRequest): Record<string, unknown> =>
  isRecord(request.params) ? request.params : {};

type ArticleHandler = (
  params: Record<string, unknown>,
) => ResultAsync<unknown, AppError>;

const handleList: ArticleHandler = (params) =>
  listDocuments().map((docs) => {
    let posts = docs.map(mapDocToPost);
    const status = stringValue(params.status);
    const tag = stringValue(params.tag);
    const category = stringValue(params.category);
    const q = stringValue(params.q)?.toLowerCase();

    if (status) {
      posts = posts.filter((post) => post.status === status);
    }
    if (tag) {
      posts = posts.filter((post) => post.tags?.some((t) => t === tag));
    }
    if (category) {
      posts = posts.filter((post) =>
        post.categories?.some((c) => c === category),
      );
    }

    if (q) {
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q),
      );
    }
    posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return { items: posts };
  });

const handleGet: ArticleHandler = (params) => {
  const articleUid = stringValue(params.articleUid ?? params.uid);
  const articlePath = stringValue(params.articlePath ?? params.path);
  const docResult = articleUid
    ? listDocuments().andThen((docs) => {
        const doc = docs.find((item) => item.meta.uid === articleUid);
        if (!doc) {
          return err(AppError.notFound("Not found"));
        }
        return okAsync(doc);
      })
    : articlePath
      ? getContentStore().match(
          (store) => store.getDoc(articlePath),
          (error) => errAsync(error),
        )
      : errAsync(AppError.invalidRequest("Missing article path or uid"));

  return docResult.andThen((doc) => {
    if (!doc.meta?.uid) {
      return errAsync(AppError.invalidRequest("Article uid is missing"));
    }
    const post = mapDocToPost(doc);
    return okAsync({
      post,
      sha: doc.sha,
      views: null,
      articleUid: doc.meta.uid,
    });
  });
};

const handleUpsert: ArticleHandler = (params) => {
  const path = stringValue(params.path ?? params.articlePath);
  const content = typeof params.content === "string" ? params.content : "";
  if (!path) {
    return errAsync(AppError.invalidRequest("Path is required"));
  }
  const meta = isRecord(params.meta) ? params.meta : undefined;
  const sha = stringValue(params.sha);
  const message = stringValue(params.message) ?? `chore: upsert ${path}`;
  const previousPath = stringValue(params.previousPath);

  return getContentStore().match(
    (store) => {
      const performUpsert = (effectiveSha?: string) =>
        store.upsertDoc({
          path,
          content,
          meta,
          sha: effectiveSha,
          message,
        });
      const enqueueIfNew = (result: { path: string; newSha: string }) =>
        store.getDoc(path).andThen((doc) => {
          if (!doc.meta?.uid) {
            return errAsync(AppError.invalidRequest("Article uid is missing"));
          }
          return enqueueArticleForNewsletter({
            articleUid: doc.meta.uid,
            articlePath: doc.path,
          }).map(() => result);
        });

      if (previousPath && previousPath !== path) {
        if (!sha) {
          return errAsync(
            AppError.conflict("SHA is required when changing article path"),
          );
        }
        return store
          .upsertDoc({
            path: previousPath,
            content,
            meta,
            sha,
            message,
          })
          .andThen(() => store.moveDoc(previousPath, path))
          .andThen(() => store.getDoc(path))
          .map((doc) => ({ path: doc.path, newSha: doc.sha }));
      }
      if (sha) {
        return performUpsert(sha);
      }
      return store
        .getDoc(path)
        .andThen(() =>
          errAsync(AppError.conflict("SHA is required to update this article")),
        )
        .orElse((error) => {
          if (error.code === "NOT_FOUND") {
            return performUpsert(undefined).andThen(enqueueIfNew);
          }
          return errAsync(error);
        });
    },
    (error) => errAsync(error),
  );
};

const handleDelete: ArticleHandler = (params) => {
  const path = stringValue(params.path ?? params.articlePath);
  if (!path) {
    return errAsync(AppError.invalidRequest("Path is required"));
  }
  const sha = stringValue(params.sha);
  const message = stringValue(params.message) ?? `chore: delete ${path}`;
  return getContentStore().match(
    (store) =>
      store.deleteDoc({
        path,
        sha: sha ?? "",
        message,
      }),
    (error) => errAsync(error),
  );
};

const handleArchive: ArticleHandler = (params) => {
  const path = stringValue(params.path ?? params.articlePath);
  if (!path) {
    return errAsync(AppError.invalidRequest("Path is required"));
  }
  const expectedSha = stringValue(params.expectedSha ?? params.sha);
  const message = stringValue(params.message) ?? `chore: archive ${path}`;
  return getContentStore().match(
    (store) =>
      store.archiveDoc({
        path,
        expectedSha,
        message,
      }),
    (error) => errAsync(error),
  );
};

const handleUnarchive: ArticleHandler = (params) => {
  const path = stringValue(params.path ?? params.articlePath);
  if (!path) {
    return errAsync(AppError.invalidRequest("Path is required"));
  }
  const expectedSha = stringValue(params.expectedSha ?? params.sha);
  const message = stringValue(params.message) ?? `chore: unarchive ${path}`;
  return getContentStore().match(
    (store) =>
      store.unarchiveDoc({
        path,
        expectedSha,
        message,
      }),
    (error) => errAsync(error),
  );
};

const HANDLERS: Record<ArticleOp, ArticleHandler> = {
  list: handleList,
  get: handleGet,
  upsert: handleUpsert,
  delete: handleDelete,
  archive: handleArchive,
  unarchive: handleUnarchive,
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let opForLog: string | undefined;

  const result = ResultAsync.fromPromise(
    request.json() as Promise<unknown>,
    (error) =>
      AppError.fromUnknown(error, {
        tag: "VALIDATION",
        message: "Invalid JSON body",
      }),
  )
    .andThen(parseRequest)
    .andThen((parsed) => {
      opForLog = parsed.op;
      const params = normalizeParams(parsed);
      const handler = HANDLERS[parsed.op];
      const run = () => handler(params);
      if (MUTATING_OPS.has(parsed.op)) {
        return requireAdminResult().andThen(run);
      }
      return run();
    });

  return result.match(
    (data) => respondOk(requestId, data),
    (error) => respondError(requestId, error, { op: opForLog }),
  );
}
