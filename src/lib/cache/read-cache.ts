type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type ReadCacheOptions = {
  ttlMs: number;
  logPrefix?: string;
};

export class ReadCache<T> {
  private readonly ttlMs: number;
  private readonly logPrefix?: string;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(options: ReadCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.logPrefix = options.logPrefix;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    if (this.logPrefix) {
      console.log(`[${this.logPrefix}] get ${key}`);
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.logPrefix) {
      console.log(`[${this.logPrefix}] set ${key}`);
    }
    const ttl = ttlMs ?? this.ttlMs;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  invalidate(key: string): void {
    if (this.logPrefix) {
      console.log(`[${this.logPrefix}] invalidate ${key}`);
    }
    this.store.delete(key);
  }
}
