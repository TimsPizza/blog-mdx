import {
  exchangeCodeForToken,
  getGitHubUser,
  issueSession,
  validateState,
} from "@/lib/server/oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }
  if (!validateState(req, state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  try {
    const accessToken = await exchangeCodeForToken(code, state);
    const user = await getGitHubUser(accessToken);
    const session = await issueSession(user.login);
    return NextResponse.json({ session, user: { login: user.login } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OAuth failed" },
      { status: 500 },
    );
  }
}
