"use client";

import { ImageIcon, Clapperboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fileUrl, type MarketingJob } from "@/types/marketing";
import { relativeTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export function JobHistory({
  jobs,
  onSelect,
  selectedId,
}: {
  jobs: MarketingJob[];
  onSelect: (job: MarketingJob) => void;
  selectedId?: string;
}) {
  if (jobs.length === 0) return null;

  return (
    <section aria-label="Previous jobs">
      <h2 className="mb-3 text-sm font-semibold text-ink">History</h2>
      <Card>
        <ul className="divide-y divide-line">
          {jobs.map((job) => {
            const thumbs = job.outputs.filter((o) => o.status === "done").slice(0, 4);
            return (
              <li key={job.id}>
                <button
                  onClick={() => onSelect(job)}
                  className={cn(
                    "flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors",
                    selectedId === job.id ? "bg-river-tint/50" : "hover:bg-surface-tint"
                  )}
                >
                  {job.kind === "image" ? (
                    <ImageIcon className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                  ) : (
                    <Clapperboard className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {job.eventName || job.brief.slice(0, 70)}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {relativeTime(job.createdAt)}
                      {job.kind === "image" && ` · ${job.formats.length} format${job.formats.length === 1 ? "" : "s"}`}
                      {job.kind === "video" && ` · ${job.durationSeconds}s video`}
                    </p>
                  </div>
                  {thumbs.length > 0 && (
                    <div className="hidden shrink-0 gap-1 sm:flex">
                      {thumbs.map((o) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={o.format}
                          src={fileUrl(o.path)}
                          alt=""
                          className="size-9 rounded-[6px] border border-line object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <Badge
                    tone={job.status === "ready" ? "river" : job.status === "failed" ? "clay" : "amber"}
                  >
                    {job.status}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
