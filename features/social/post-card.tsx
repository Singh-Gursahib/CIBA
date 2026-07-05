"use client";

import { useState, useTransition, type ReactNode } from "react";
import { MonitorPlay, Camera, Trash2, Send, ExternalLink, Loader2, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/utils/dates";
import { deletePostAction } from "@/features/social/actions";
import {
  fileUrl,
  FORMAT_META,
  PLATFORM_META,
  type PlatformTarget,
  type PostStatus,
  type SocialPost,
  type TargetStatus,
} from "@/types/social";

const STATUS_META: Record<PostStatus, { label: string; tone: "neutral" | "river" | "amber" | "clay" | "sage" }> = {
  draft: { label: "Draft", tone: "neutral" },
  rendering: { label: "Rendering", tone: "amber" },
  ready: { label: "Ready to publish", tone: "river" },
  publishing: { label: "Publishing", tone: "amber" },
  published: { label: "Published", tone: "sage" },
  failed: { label: "Failed", tone: "clay" },
};

const TARGET_ICON = { youtube: MonitorPlay, instagram: Camera };

interface PostInsightVM {
  platform: "youtube" | "instagram";
  externalId: string;
  url?: string;
  metrics: { label: string; value: number }[];
}

function fmtMetric(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function TargetChip({ target }: { target: PlatformTarget }) {
  const Icon = TARGET_ICON[target.platform];
  const meta = PLATFORM_META[target.platform];
  const statusNode: Record<TargetStatus, ReactNode> = {
    pending: <span className="text-ink-faint">queued</span>,
    publishing: <Loader2 className="size-3 animate-spin text-amber" />,
    published: <CheckCircle2 className="size-3 text-sage" />,
    failed: <AlertCircle className="size-3 text-clay" />,
    skipped: <span className="text-ink-faint">skipped</span>,
  };
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px]">
      <Icon className="size-3.5 text-ink-soft" strokeWidth={1.75} />
      <span className="font-medium text-ink">{meta.label}</span>
      {statusNode[target.status]}
      {target.url && target.status === "published" && (
        <a href={target.url} target="_blank" rel="noreferrer" className="text-river hover:text-river-deep" title="Open post">
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

export function PostCard({
  post,
  onUpdate,
  onRemove,
  track,
}: {
  post: SocialPost;
  onUpdate: (post: SocialPost) => void;
  onRemove: (id: string) => void;
  track: (id: string) => void;
}) {
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const [insights, setInsights] = useState<PostInsightVM[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const status = STATUS_META[post.status];
  const format = FORMAT_META[post.format];

  const canPublish =
    !publishing &&
    post.mediaPath &&
    (post.status === "ready" || post.status === "published" || post.status === "failed") &&
    post.targets.some((t) => t.status !== "published");

  const publish = async () => {
    setPublishing(true);
    track(post.id); // live per-target updates while the route runs
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = (await res.json()) as { post?: SocialPost; error?: string };
      if (data.post) {
        onUpdate(data.post);
        const ok = data.post.targets.some((t) => t.status === "published");
        toast(ok ? "success" : "error", ok ? "Published." : data.post.error ?? "Publish failed.");
      } else {
        toast("error", data.error ?? "Publish failed.");
      }
    } catch {
      toast("error", "Publish request failed.");
    } finally {
      setPublishing(false);
    }
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/social/posts/${post.id}/insights`, { cache: "no-store" });
      const data = (await res.json()) as { insights?: PostInsightVM[] };
      setInsights(data.insights ?? []);
    } catch {
      toast("error", "Could not load stats.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const remove = () => {
    startDelete(async () => {
      const result = await deletePostAction(post.id);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      onRemove(post.id);
    });
  };

  return (
    <Card>
      <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
        {/* Media preview */}
        <div className={cn("relative flex items-center justify-center bg-surface-tint sm:rounded-l-lg", format.ratioClass, "max-h-64")}>
          {post.mediaPath ? (
            <video src={fileUrl(post.mediaPath)} controls className="h-full w-full object-cover sm:rounded-l-lg" />
          ) : post.status === "rendering" ? (
            <div className="flex w-full flex-col items-center gap-2 px-4 text-center">
              <Loader2 className="size-5 animate-spin text-river" />
              <span className="text-xs text-ink-soft">{post.renderStage ?? "Rendering"}</span>
              <ProgressBar value={post.renderProgress ?? 0} className="w-full" />
            </div>
          ) : (
            <span className="px-4 text-center text-xs text-ink-faint">No media yet</span>
          )}
        </div>

        {/* Body */}
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{post.channelBrand}</Badge>
            <Badge tone="neutral">{format.label}</Badge>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="ml-auto text-[11px] text-ink-faint">{relativeTime(post.createdAt)}</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">{post.title}</p>
            <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft whitespace-pre-line">{post.caption}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.slice(0, 6).map((h) => (
              <span key={h} className="text-[11px] text-river">{h}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {post.targets.map((t) => (
              <TargetChip key={t.platform} target={t} />
            ))}
          </div>

          {post.error && post.status === "failed" && (
            <p className="rounded-md border border-clay/25 bg-clay-tint px-3 py-2 text-xs text-clay">{post.error}</p>
          )}

          {insights && insights.length > 0 && (
            <div className="space-y-2 rounded-md border border-line bg-surface-tint/40 px-3 py-2.5">
              {insights.map((ins) => {
                const Icon = TARGET_ICON[ins.platform];
                return (
                  <div key={ins.platform} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink">
                      <Icon className="size-3.5 text-ink-soft" strokeWidth={1.75} />
                      {PLATFORM_META[ins.platform].label}
                    </span>
                    {ins.metrics.map((m) => (
                      <span key={m.label} className="text-[11.5px] text-ink-soft">
                        <span className="font-semibold text-ink">{fmtMetric(m.value)}</span> {m.label}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {insights && insights.length === 0 && (
            <p className="text-[11.5px] text-ink-faint">No stats yet. Metrics appear a few hours after publishing.</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              loading={publishing}
              disabled={!canPublish}
              onClick={publish}
              icon={<Send className="size-3.5" />}
            >
              {post.targets.some((t) => t.status === "published") ? "Publish remaining" : "Publish"}
            </Button>
            {post.targets.some((t) => t.status === "published") && (
              <Button
                size="sm"
                variant="secondary"
                loading={insightsLoading}
                onClick={loadInsights}
                icon={<BarChart3 className="size-3.5" />}
              >
                Stats
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              loading={deletePending}
              onClick={remove}
              icon={<Trash2 className="size-3.5" />}
            >
              Delete
            </Button>
          </div>
        </CardBody>
      </div>
    </Card>
  );
}
