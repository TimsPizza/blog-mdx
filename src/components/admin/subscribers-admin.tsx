"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";

type AdminSubscriberItem = {
  id: number;
  email: string;
  status: "active" | "unsubscribed";
  source: string | null;
  created_at: number;
  updated_at: number;
};

const STATUS_OPTIONS = ["all", "active", "unsubscribed"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const formatDate = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function SubscribersAdmin() {
  const [items, setItems] = useState<AdminSubscriberItem[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [subscribeEnabled, setSubscribeEnabled] = useState<boolean | null>(
    null,
  );
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const fetchSubscribeFlag = async () => {
    try {
      const res = await fetch("/api/admin/subscribe", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: { enabled?: boolean } };
      if (typeof data.data?.enabled === "boolean") {
        setSubscribeEnabled(data.data.enabled);
      }
    } catch {
      // ignore
    }
  };

  const fetchSubscribers = async (nextStatus = status) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus !== "all") params.set("status", nextStatus);
      const res = await fetch(`/api/admin/subscribers?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to load subscribers.");
        return;
      }
      const data = (await res.json()) as {
        data?: { items?: AdminSubscriberItem[] };
      };
      setItems(Array.isArray(data.data?.items) ? (data.data?.items ?? []) : []);
    } catch (err) {
      console.error("Failed to load subscribers", err);
      setError("Failed to load subscribers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSubscribers(status);
  }, [status]);

  useEffect(() => {
    void fetchSubscribeFlag();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.email.toLowerCase().includes(q) ||
        (item.source ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const runAction = async (action: string, ids: number[]) => {
    if (ids.length === 0) return;
    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete ${ids.length} subscriber(s)? This cannot be undone.`,
      );
      if (!confirmed) return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Action failed.");
        return;
      }
      await fetchSubscribers(status);
    } catch (err) {
      console.error("Subscriber action failed", err);
      setError("Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNewsletter = async () => {
    setSendLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/newsletter", { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to send newsletter.");
        return;
      }
      const data = (await res.json()) as {
        data?: {
          queued?: number;
          sent?: number;
          skipped?: number;
          skippedNotFound?: number;
          skippedNotPublished?: number;
          recipients?: number;
        };
      };
      const queued = data.data?.queued ?? 0;
      const sent = data.data?.sent ?? 0;
      const skipped = data.data?.skipped ?? 0;
      const recipients = data.data?.recipients ?? 0;
      const skippedNotFound = data.data?.skippedNotFound ?? 0;
      const skippedNotPublished = data.data?.skippedNotPublished ?? 0;
      setNotice(
        `Newsletter sent: queued ${queued}, sent ${sent}, skipped ${skipped} (not found ${skippedNotFound}, not published ${skippedNotPublished}), recipients ${recipients}.`,
      );
    } catch (err) {
      console.error("Failed to send newsletter", err);
      setError("Failed to send newsletter.");
    } finally {
      setSendLoading(false);
    }
  };

  const toggleSubscribe = async () => {
    if (subscribeEnabled === null) return;
    setSubscribeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !subscribeEnabled }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to update subscribe flag.");
        return;
      }
      const data = (await res.json()) as { data?: { enabled?: boolean } };
      if (typeof data.data?.enabled === "boolean") {
        setSubscribeEnabled(data.data.enabled);
      }
    } catch (err) {
      console.error("Failed to update subscribe flag", err);
      setError("Failed to update subscribe flag.");
    } finally {
      setSubscribeLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subscribers</h1>
          <p className="text-muted-foreground text-sm">
            Manage newsletter subscribers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subscribeEnabled !== null && (
            <Button
              variant={subscribeEnabled ? "outline" : "default"}
              onClick={toggleSubscribe}
              disabled={subscribeLoading}
            >
              {subscribeLoading
                ? "Updating..."
                : subscribeEnabled
                  ? "Disable Subscribe"
                  : "Enable Subscribe"}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleSendNewsletter}
            disabled={loading || actionLoading || sendLoading || subscribeLoading}
          >
            {sendLoading ? "Sending..." : "Send Newsletter"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={status === option ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus(option)}
              disabled={loading || actionLoading}
            >
              {option}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search email or source..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-55"
        />
        {loading && (
          <span className="text-muted-foreground text-sm">Loading...</span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="rounded-md border">
        <div className="text-muted-foreground grid grid-cols-[1fr,140px,140px] items-center gap-4 border-b px-4 py-2 text-sm font-medium">
          <span>Email</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr,140px,140px] items-center gap-4 px-4 py-3"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">{item.email}</div>
                <div className="text-muted-foreground text-xs">
                  {item.source ?? "web"} | {formatDate(item.created_at)}
                </div>
              </div>
              <div className="text-muted-foreground text-sm">{item.status}</div>
              <div className="flex flex-col items-end gap-2">
                {item.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runAction("archive", [item.id])}
                    disabled={actionLoading}
                  >
                    Archive
                  </Button>
                )}
                {item.status === "unsubscribed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runAction("unarchive", [item.id])}
                    disabled={actionLoading}
                  >
                    Unarchive
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => runAction("delete", [item.id])}
                  disabled={actionLoading}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-muted-foreground px-4 py-6 text-sm">
              No subscribers found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
