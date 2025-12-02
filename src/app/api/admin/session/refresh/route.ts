import { refreshSession } from "@/lib/server/oauth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken : null;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Missing refreshToken" },
      { status: 400 },
    );
  }
  const session = await refreshSession(refreshToken);
  if (!session) {
    return NextResponse.json(
      { error: "Invalid refreshToken" },
      { status: 401 },
    );
  }
  return NextResponse.json({ session });
}
