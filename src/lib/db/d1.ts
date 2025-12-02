type SqlParam = string | number | null;

export interface D1ClientConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

type D1ResultRow = Record<string, unknown>;

interface D1ExecuteResponse<T = D1ResultRow> {
  success: boolean;
  result?: {
    results?: T[];
  };
  errors?: Array<{ message: string }>;
}

export class D1Client {
  private readonly accountId: string;
  private readonly databaseId: string;
  private readonly apiToken: string;

  constructor(config: D1ClientConfig) {
    this.accountId = config.accountId;
    this.databaseId = config.databaseId;
    this.apiToken = config.apiToken;
  }

  async query<T = D1ResultRow>(
    sql: string,
    params: SqlParam[] = [],
  ): Promise<T[]> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/raw`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 query failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as D1ExecuteResponse<T>;
    if (!json.success) {
      const message = json.errors?.map((e) => e.message).join("; ") ?? "error";
      throw new Error(`D1 error: ${message}`);
    }
    return json.result?.results ?? [];
  }
}

export class ViewsRepository {
  constructor(private readonly db: D1Client | null) {}

  async increment(slug: string): Promise<number | null> {
    if (!this.db) return null;
    const rows = await this.db.query<{ count: number }>(
      "SELECT count FROM views WHERE slug = ?1",
      [slug],
    );
    const current = rows[0]?.count ?? 0;
    const next = current + 1;
    await this.db.query(
      "INSERT OR REPLACE INTO views (slug, count) VALUES (?1, ?2)",
      [slug, next],
    );
    return next;
  }

  async getCount(slug: string): Promise<number | null> {
    if (!this.db) return null;
    const rows = await this.db.query<{ count: number }>(
      "SELECT count FROM views WHERE slug = ?1",
      [slug],
    );
    return rows[0]?.count ?? 0;
  }
}

export interface SessionRecord {
  token: string;
  refreshToken: string;
  githubLogin: string;
  expiresAt: string;
  createdAt: string;
}

export class SessionsRepository {
  constructor(private readonly db: D1Client | null) {}

  async createSession(args: {
    token: string;
    refreshToken: string;
    githubLogin: string;
    expiresAt: string;
  }): Promise<void> {
    if (!this.db) return;
    await this.db.query(
      "INSERT INTO sessions (token, refresh_token, github_login, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
      [args.token, args.refreshToken, args.githubLogin, args.expiresAt],
    );
  }

  async findByRefreshToken(
    refreshToken: string,
  ): Promise<SessionRecord | null> {
    if (!this.db) return null;
    const rows = await this.db.query<SessionRecord>(
      "SELECT token, refresh_token as refreshToken, github_login as githubLogin, expires_at as expiresAt, created_at as createdAt FROM sessions WHERE refresh_token = ?1",
      [refreshToken],
    );
    return rows[0] ?? null;
  }
}

export interface VisitRecord {
  slug: string;
  ip: string | null;
  ua: string | null;
  createdAt: string;
}

export class VisitsRepository {
  constructor(private readonly db: D1Client | null) {}

  async recordVisit(slug: string, ip: string | null, ua: string | null) {
    if (!this.db) return;
    await this.db.query(
      "INSERT INTO visits (slug, ip, ua, created_at) VALUES (?1, ?2, ?3, datetime('now'))",
      [slug, ip, ua],
    );
  }
}

export interface LogRecord {
  level: "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
}

export class LogsRepository {
  constructor(private readonly db: D1Client | null) {}

  async write(log: LogRecord) {
    if (!this.db) return;
    await this.db.query(
      "INSERT INTO logs (level, message, meta, created_at) VALUES (?1, ?2, ?3, datetime('now'))",
      [log.level, log.message, JSON.stringify(log.meta ?? {})],
    );
  }
}

export function createD1ClientFromEnv(): D1Client | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) {
    return null;
  }
  return new D1Client({ accountId, databaseId, apiToken });
}
