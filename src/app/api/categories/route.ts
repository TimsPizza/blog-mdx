import { listAllCategories, listDocuments } from "@/lib/server/content-store";
import { jsonError } from "@/lib/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  return listAllCategories()
    .orElse(() =>
      listDocuments().map((docs) =>
        docs
          .map((doc) => doc.path.split("/")[0])
          .filter((item): item is string => Boolean(item)),
      ),
    )
    .match(
      (categories) => NextResponse.json({ items: categories }),
      jsonError,
    );
}
