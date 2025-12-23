export type DocStatus = "draft" | "published" | "archived";

export interface MdxDocument {
  path: string; // e.g. posts/hello-world.mdx
  meta: MdxDocumentMeta;
  content: string; // MDX content
  sha: string; // Git blob SHA (ETag anchor)
}

export interface MdxDocumentMeta {
  title?: string;
  summary?: string;
  tags?: string[];
  coverImageUrl?: string;
  status: DocStatus;
  uid: string; // Unique identifier for the document
  createdAt?: number; // Unix timestamp (seconds)
  updatedAt?: number; // Unix timestamp (seconds)
}

export type MediaKind = "image" | "video" | "audio" | "binary";

export interface MediaReference {
  id: string;
  kind: MediaKind;
  url: string; // External URL (GitHub raw, S3, CDN, etc.)
  thumbnailUrl?: string;
  contentType?: string;
  sizeBytes?: number;
  availability?: "available" | "unknown" | "broken";
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code:
    | "not_found"
    | "conflict"
    | "unauthorized"
    | "forbidden"
    | "validation_failed"
    | "server_error";
  message: string;
  details?: unknown;
}

export interface GetDocResponse {
  doc: MdxDocument;
  media?: MediaReference[]; // If you choose to hydrate references alongside the doc
}

export interface ListDocsRequest {
  cursor?: string;
  limit?: number;
  tag?: string;
  status?: DocStatus;
}

export interface ListDocsResponse {
  items: MdxDocumentMeta[];
  nextCursor?: string;
}

export interface UpsertDocRequest {
  path: string;
  content: string; // MDX content
  meta?: Record<string, unknown>; // Structured metadata to write to meta.json
  sha?: string; // Required for updates to enforce optimistic locking
  message: string; // Git commit message
}

export interface UpsertDocResponse {
  path: string;
  newSha: string; // New blob SHA
  commitSha: string; // Commit SHA that wrote the file
}

export interface DeleteDocRequest {
  path: string;
  sha: string; // Blob SHA to avoid deleting stale content
  message: string;
}

export interface DeleteDocResponse {
  deleted: true;
  commitSha: string;
}

export interface ArchiveDocRequest {
  path: string;
  expectedSha?: string; // Optional sanity check against metadata entry
  message: string;
}

export interface ArchiveDocResponse {
  status: DocStatus;
  commitSha: string;
}

// Admin auth via GitHub OAuth (TOTP removed)
export interface StartOAuthResponse {
  authUrl: string;
  state: string;
}

export interface ExchangeOAuthCodeRequest {
  code: string;
  state: string;
}

export interface Session {
  token: string; // bearer or cookie value
  expiresAt?: string;
  refreshToken?: string;
}

export interface ExchangeOAuthCodeResponse {
  session: Session;
}

export interface RefreshSessionRequest {
  refreshToken: string;
}

export interface RefreshSessionResponse {
  session: Session;
}

export interface UnarchiveDocRequest {
  path: string;
  expectedSha?: string;
  message: string;
}

export interface UnarchiveDocResponse {
  status: DocStatus;
  commitSha: string;
}

export interface BlogApiClient {
  listDocs(req: ListDocsRequest): Promise<ListDocsResponse>;
  getDoc(path: string): Promise<GetDocResponse>;
  upsertDoc(req: UpsertDocRequest): Promise<UpsertDocResponse>;
  deleteDoc(req: DeleteDocRequest): Promise<DeleteDocResponse>;
  archiveDoc(req: ArchiveDocRequest): Promise<ArchiveDocResponse>;
  unarchiveDoc(req: UnarchiveDocRequest): Promise<UnarchiveDocResponse>;
  startOAuth?(): Promise<StartOAuthResponse>;
  exchangeOAuthCode?(
    req: ExchangeOAuthCodeRequest,
  ): Promise<ExchangeOAuthCodeResponse>;
  refreshSession?(req: RefreshSessionRequest): Promise<RefreshSessionResponse>;
}
