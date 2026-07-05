"use client";

import { useState } from "react";
import { BarChart3, RefreshCw, Users, Eye, Clapperboard } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ChannelStat {
  channelKey: string;
  brand: string;
  configured: boolean;
  subscribers?: number;
  views?: number;
  videoCount?: number;
  error?: string;
}

function fmt(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function ChannelStats() {
  const [stats, setStats] = useState<ChannelStat[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/stats", { cache: "no-store" });
      const data = (await res.json()) as { stats: ChannelStat[] };
      setStats(data.stats);
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-river" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-ink">Channel performance</span>
          <Button
            size="sm"
            variant="ghost"
            loading={loading}
            onClick={load}
            icon={<RefreshCw className="size-3.5" />}
            className="ml-auto"
          >
            {stats ? "Refresh" : "Load stats"}
          </Button>
        </div>

        {!stats ? (
          <p className="text-xs text-ink-faint">YouTube subscribers and views per channel. Loaded on demand.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.channelKey} className={cn("rounded-md border border-line bg-surface-tint/50 px-3.5 py-3", !s.configured && !s.error && "opacity-60")}>
                <p className="text-[13px] font-semibold text-ink">{s.brand}</p>
                {s.error ? (
                  <p className="mt-1 text-[11px] text-clay">{s.error}</p>
                ) : !s.configured && s.subscribers == null ? (
                  <p className="mt-1 text-[11px] text-ink-faint">Not connected</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
                    <span className="inline-flex items-center gap-1"><Users className="size-3.5 text-ink-faint" />{fmt(s.subscribers)}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="size-3.5 text-ink-faint" />{fmt(s.views)}</span>
                    <span className="inline-flex items-center gap-1"><Clapperboard className="size-3.5 text-ink-faint" />{fmt(s.videoCount)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
