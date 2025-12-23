import { AppError } from "@/types/error";
import { NextResponse } from "next/server";

export function jsonError(error: AppError) {
  return NextResponse.json({ error: error.publicPayload() }, { status: error.status });
}
