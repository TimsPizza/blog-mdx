import { NextRequest, NextResponse } from "next/server";
import { SessionsRepository, createD1ClientFromEnv } from "@/lib/db/d1";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

export function buildGitHubAuthUrl(state: string) {
  const clientId = requiredEnv("GITHUB_OAUTH_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo",
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export function applyStateCookie(res: NextResponse, state: string) {
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
}

export async function exchangeCodeForToken(code: string, state: string) {
  const clientId = requiredEnv("GITHUB_OAUTH_CLIENT_ID");
  const clientSecret = requiredEnv("GITHUB_OAUTH_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    state,
  });

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token exchange failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
  };
  if (!json.access_token) {
    throw new Error(`GitHub token missing: ${json.error ?? "unknown error"}`);
  }
  return json.access_token;
}

export async function getGitHubUser(accessToken: string): Promise<{
  login: string;
  id: number;
}> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub user fetch failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { login: string; id: number };
  return json;
}

export async function issueSession(login: string) {
  const now = Date.now();
  const expiresAt = new Date(now + 1000 * 60 * 60 * 12).toISOString(); // 12h
  const token = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const sessionsRepo = new SessionsRepository(createD1ClientFromEnv());
  await sessionsRepo.createSession({
    token,
    refreshToken,
    githubLogin: login,
    expiresAt,
  });
  return { token, refreshToken, expiresAt };
}

export async function refreshSession(refreshToken: string) {
  const sessionsRepo = new SessionsRepository(createD1ClientFromEnv());
  const existing = await sessionsRepo.findByRefreshToken(refreshToken);
  if (!existing) {
    return null;
  }
  const now = Date.now();
  const expiresAt = new Date(now + 1000 * 60 * 60 * 12).toISOString();
  const token = crypto.randomUUID();
  const newRefreshToken = crypto.randomUUID();
  await sessionsRepo.createSession({
    token,
    refreshToken: newRefreshToken,
    githubLogin: existing.githubLogin,
    expiresAt,
  });
  return { token, refreshToken: newRefreshToken, expiresAt };
}

export function validateState(req: NextRequest, state: string | null): boolean {
  const cookieState = req.cookies.get("oauth_state")?.value;
  return !!state && !!cookieState && state === cookieState;
}
