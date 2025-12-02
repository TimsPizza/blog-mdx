import { applyStateCookie, buildGitHubAuthUrl } from "@/lib/server/oauth";
import { NextResponse } from "next/server";

export async function POST() {
  const state = crypto.randomUUID();
  const authUrl = buildGitHubAuthUrl(state);
  const res = NextResponse.json({ authUrl, state });
  applyStateCookie(res, state);
  return res;
}
