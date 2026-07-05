"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { AssetUploader } from "./asset-uploader";
import { useJobPolling } from "./use-job";
import { createVideoJob } from "./actions";
import { cn } from "@/lib/utils/cn";
import type { VideoFormat } from "@/types/marketing";

const DURATIONS = [10, 15, 20] as const;

function ElapsedTimer({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className="font-mono text-sm tabular-nums text-ink-soft" aria-label="Elapsed time">
      {mm}:{ss}
    </span>
  );
}

export function VideoPanel() {
  const router = useRouter();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [brief, setBrief] = useState("");
  const [eventName, setEventName] = useState("");
  const [duration, setDuration] = useState<number>(15);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("landscape");
  const [submitting, startSubmit] = useTransition();
  const { job, video, track } = useJobPolling(1000);

  const generating = job?.status === "generating";
  const ready = job?.status === "ready" && job.videoOutputUrl;

  const submit = () => {
    startSubmit(async () => {
      const fd = new FormData();
      fd.set("brief", brief);
      fd.set("eventName", eventName);
      fd.set("duration", String(duration));
      fd.set("videoFormat", videoFormat);
      files.forEach((f) => fd.append("assets", f));
      const result = await createVideoJob(fd);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      track(result.jobId);
      router.refresh();
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <CardTitle>Create a promotional video</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-2.5 rounded-md border border-amber/25 bg-amber-tint px-3.5 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-amber" />
            <p className="text-[13px] text-ink-soft">
              Preview pipeline — this demonstrates the full experience with a sample render. The
              production video engine plugs in without any interface changes.
            </p>
          </div>

          <div>
            <Label>Source assets</Label>
            <AssetUploader files={files} onChange={setFiles} disabled={generating} />
          </div>

          <div>
            <Label htmlFor="video-brief">Event or announcement</Label>
            <Textarea
              id="video-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={generating}
              placeholder="A 15 second teaser for Kamloops Pitch Night: quick cuts of past events, event title, date, and a closing call to action…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="video-event">Event name</Label>
              <Input
                id="video-event"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                disabled={generating}
                placeholder="Kamloops Pitch Night"
              />
            </div>
            <div>
              <Label>Duration</Label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={generating}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "h-9.5 flex-1 rounded-md border text-sm font-medium transition-colors",
                      duration === d
                        ? "border-river bg-river-tint text-river-deep"
                        : "border-line-strong bg-surface text-ink-soft hover:border-ink-faint"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Orientation</Label>
            <div className="flex gap-2">
              {(
                [
                  ["landscape", "16:9 · Landscape"],
                  ["vertical", "9:16 · Vertical"],
                ] as [VideoFormat, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={generating}
                  onClick={() => setVideoFormat(value)}
                  className={cn(
                    "h-9.5 flex-1 rounded-md border text-sm font-medium transition-colors",
                    videoFormat === value
                      ? "border-river bg-river-tint text-river-deep"
                      : "border-line-strong bg-surface text-ink-soft hover:border-ink-faint"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <FieldHint>Around {duration} seconds, sized for {videoFormat === "landscape" ? "web and LinkedIn" : "stories and reels"}.</FieldHint>
          </div>

          <div className="flex justify-end border-t border-line pt-4">
            <Button
              onClick={submit}
              disabled={!brief.trim() || generating}
              loading={submitting || generating}
              icon={<Clapperboard className="size-4" />}
            >
              {generating ? "Generating…" : "Generate video"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Video</h2>
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-line bg-surface-tint",
            videoFormat === "landscape" ? "aspect-video" : "mx-auto aspect-[9/16] max-w-[280px]"
          )}
        >
          {ready ? (
            <video
              src={job.videoOutputUrl}
              controls
              className="absolute inset-0 h-full w-full bg-ink object-contain"
            />
          ) : generating && job?.startedAt ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <ProgressRing value={video?.progress ?? 2} />
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-ink">
                  {video?.progress ?? 0}%
                </span>
              </div>
              <ElapsedTimer since={job.startedAt} />
              <p className="animate-fade-in text-[13px] text-ink-soft" key={video?.stage}>
                {video?.stage ?? "Preparing"}…
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <Clapperboard className="size-6 text-ink-faint" strokeWidth={1.5} />
              <p className="px-6 text-[13px] text-ink-faint">
                Your generated video plays here, with live progress while it renders.
              </p>
            </div>
          )}
        </div>
        {ready && (
          <a href={job.videoOutputUrl} download="ciba-promo.mp4">
            <Button variant="secondary" size="sm" icon={<Download className="size-3.5" />}>
              Download video
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
