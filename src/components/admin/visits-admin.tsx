"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";

type AdminVisitItem = {
  id: number;
  articleUid: string;
  articlePath: string;
  ip: string | null;
  ua: string | null;
  createdAt: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const clampNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export function VisitsAdmin() {
  const [items, setItems] = useState<AdminVisitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articlePath, setArticlePath] = useState("");
  const [articleUid, setArticleUid] = useState("");
  const [ip, setIp] = useState("");
  const [ua, setUa] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState("200");

  const buildParams = (overrides?: Partial<Record<string, string>>) => {
    const next = {
      articlePath,
      articleUid,
      ip,
      ua,
      from,
      to,
      limit,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.articlePath.trim()) params.set("articlePath", next.articlePath.trim());
    if (next.articleUid.trim()) params.set("articleUid", next.articleUid.trim());
    if (next.ip.trim()) params.set("ip", next.ip.trim());
    if (next.ua.trim()) params.set("ua", next.ua.trim());
    if (next.from.trim()) params.set("from", next.from.trim());
    if (next.to.trim()) params.set("to", next.to.trim());
    params.set("limit", String(clampNumber(next.limit, 200)));
    return params;
  };

  const filtersActive = useMemo(
    () =>
      Boolean(
        articlePath.trim() ||
          articleUid.trim() ||
          ip.trim() ||
          ua.trim() ||
          from.trim() ||
          to.trim(),
      ),
    [articlePath, articleUid, ip, ua, from, to],
  );

  const fetchVisits = async (overrides?: Partial<Record<string, string>>) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(overrides);

      const res = await fetch(`/api/admin/visits?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to load visits.");
        return;
      }
      const data = (await res.json()) as {
        data?: { items?: AdminVisitItem[] };
      };
      setItems(Array.isArray(data.data?.items) ? data.data?.items ?? [] : []);
    } catch (err) {
      console.error("Failed to load visits", err);
      setError("Failed to load visits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVisits();
  }, []);

  const resetFilters = () => {
    setArticlePath("");
    setArticleUid("");
    setIp("");
    setUa("");
    setFrom("");
    setTo("");
    setLimit("200");
    void fetchVisits({
      articlePath: "",
      articleUid: "",
      ip: "",
      ua: "",
      from: "",
      to: "",
      limit: "200",
    });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visits</h1>
          <p className="text-muted-foreground text-sm">
            Review visitor activity captured in the visits table.
          </p>
        </div>
      </div>

      <form
        className="bg-card rounded-lg border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void fetchVisits();
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Article path</span>
            <Input
              value={articlePath}
              onChange={(event) => setArticlePath(event.target.value)}
              placeholder="/category/post"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Article UID</span>
            <Input
              value={articleUid}
              onChange={(event) => setArticleUid(event.target.value)}
              placeholder="uid"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">IP</span>
            <Input
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="127.0.0.1"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">User agent</span>
            <Input
              value={ua}
              onChange={(event) => setUa(event.target.value)}
              placeholder="Mozilla/5.0"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">
              From (date or ISO)
            </span>
            <Input
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="2026-01-01"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">
              To (date or ISO)
            </span>
            <Input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="2026-01-31"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Limit</span>
            <Input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="w-28"
            />
          </label>
          <Button type="submit" disabled={loading}>
            Apply filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            disabled={loading || !filtersActive}
          >
            Reset
          </Button>
          {loading && (
            <span className="text-muted-foreground text-sm">Loading...</span>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <div className="text-muted-foreground grid grid-cols-[170px,1.4fr,1fr,140px,2fr] items-center gap-4 border-b px-4 py-2 text-sm font-medium">
          <span>Time</span>
          <span>Path</span>
          <span>UID</span>
          <span>IP</span>
          <span>User Agent</span>
        </div>
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[170px,1.4fr,1fr,140px,2fr] items-start gap-4 px-4 py-3 text-sm"
            >
              <div className="text-muted-foreground text-xs">
                {formatDate(item.createdAt)}
              </div>
              <div className="break-all text-xs">{item.articlePath}</div>
              <div className="break-all text-xs">{item.articleUid}</div>
              <div className="break-all text-xs">{item.ip ?? "-"}</div>
              <div className="text-muted-foreground truncate text-xs">
                <span title={item.ua ?? ""}>{item.ua ?? "-"}</span>
              </div>
            </div>
          ))}
          {!loading && items.length === 0 && (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              No visits found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
