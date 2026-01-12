import { type D1Client, type SqlParam } from "@/lib/db/d1";
import { AppError } from "@/types/error";
import { backOff, type BackoffOptions } from "exponential-backoff";
import { err, ok, type Result } from "neverthrow";

const DEFAULT_MAX_SIZE = 64;
const DEFAULT_TTL_MS = 300_000;
const DEFAULT_BACKOFF: BackoffOptions = {
  delayFirstAttempt: false,
  jitter: "full",
  maxDelay: Number.POSITIVE_INFINITY,
  numOfAttempts: 5,
  retry: () => true,
  startingDelay: 100,
  timeMultiple: 2,
};

export interface CachePoolOptions {
  size?: number;
  ttlMs?: number;
  backoff?: BackoffOptions;
}

type Timer = ReturnType<typeof setTimeout>;

/**
 * CachePool batches items and flushes them either when it reaches max size
 * or when the TTL expires. Flushes are serialized and retried with backoff.
 */
export class CachePool<T> {
  private readonly limit: number;
  private readonly ttlMs: number;
  private readonly backoff: BackoffOptions;
  private readonly flushFn: (items: T[]) => Promise<void>;
  private buffer: T[] = [];
  private timer: Timer | null = null;
  private flushing = false;
  private pendingFlush = false;
  private closed = false;

  constructor(
    flushFn: (items: T[]) => Promise<void>,
    options?: CachePoolOptions,
  ) {
    this.flushFn = flushFn;
    this.limit = options?.size ?? DEFAULT_MAX_SIZE;
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.backoff = options?.backoff
      ? { ...DEFAULT_BACKOFF, ...options.backoff }
      : DEFAULT_BACKOFF;
  }

  async add(item: T): Promise<Result<void, AppError>> {
    if (this.closed) {
      return err(
        new AppError({
          code: "INTERNAL",
          message: "cache pool closed",
          tag: "DB",
          expose: false,
        }),
      );
    }
    this.buffer.push(item);
    if (this.buffer.length >= this.limit) {
      return this.flush();
    }
    this.ensureTimer();
    return ok(undefined);
  }

  async flush(): Promise<Result<void, AppError>> {
    if (this.flushing) {
      this.pendingFlush = true;
      return ok(undefined);
    }
    if (this.buffer.length === 0) {
      this.clearTimer();
      return ok(undefined);
    }
    this.flushing = true;
    const batch = this.buffer;
    this.buffer = [];
    this.clearTimer();
    let result: Result<void, AppError> = ok(undefined);
    try {
      await backOff(() => this.flushFn(batch), this.backoff);
      console.debug(`[cache-db] flushing ${batch.length} items`);
      result = ok(undefined);
    } catch (error) {
      // Restore the batch at the front so we don't lose work.
      this.buffer = [...batch, ...this.buffer];
      this.ensureTimer();
      result = err(
        AppError.fromUnknown(error, {
          tag: "DB",
          message: "cache pool flush failed",
        }),
      );
    } finally {
      this.flushing = false;
      const rerun = this.pendingFlush;
      this.pendingFlush = false;
      if (rerun && this.buffer.length > 0) {
        void this.flush();
        return result;
      }
      if (this.buffer.length > 0) {
        this.ensureTimer();
      }
    }
    return result;
  }

  async close(): Promise<Result<void, AppError>> {
    this.closed = true;
    return this.flush();
  }

  private ensureTimer() {
    if (this.timer || this.buffer.length === 0) return;
    this.timer = setTimeout(() => {
      void this.flush();
    }, this.ttlMs);
  }

  private clearTimer() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}

export interface D1Statement {
  sql: string;
  params?: SqlParam[];
}

export class D1Synchronizer {
  private readonly pool: CachePool<D1Statement>;

  constructor(
    private readonly client: D1Client,
    options?: CachePoolOptions,
  ) {
    this.pool = new CachePool<D1Statement>(async (batch) => {
      for (const stmt of batch) {
        const result = await this.client.query(stmt.sql, stmt.params ?? []);
        result.match(
          () => undefined,
          (error) => {
            throw error;
          },
        );
      }
    }, options);
  }

  enqueue(statement: D1Statement): Promise<Result<void, AppError>> {
    return this.pool.add(statement);
  }

  flush(): Promise<Result<void, AppError>> {
    return this.pool.flush();
  }

  close(): Promise<Result<void, AppError>> {
    return this.pool.close();
  }
}

export function createD1Synchronizer(
  client: D1Client | null,
  options?: CachePoolOptions,
): D1Synchronizer | null {
  if (!client) return null;
  return new D1Synchronizer(client, options);
}
