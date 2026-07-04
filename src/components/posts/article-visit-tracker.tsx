"use client";

import { useEffect, useRef } from "react";

type ArticleVisitTrackerProps = {
  articlePath?: string;
  articleUid?: string;
};

export function ArticleVisitTracker({
  articlePath,
  articleUid,
}: ArticleVisitTrackerProps) {
  const lastTrackedArticle = useRef<string | null>(null);

  useEffect(() => {
    if (!articlePath || !articleUid) return;
    const articleKey = `${articleUid}:${articlePath}`;
    if (lastTrackedArticle.current === articleKey) return;
    lastTrackedArticle.current = articleKey;

    void fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articlePath, articleUid }),
      keepalive: true,
    }).catch(() => undefined);
  }, [articlePath, articleUid]);

  return null;
}
