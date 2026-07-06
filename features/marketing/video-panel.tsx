"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea, Label, FieldHint } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { AssetUploader } from "./asset-uploader";
import { cn } from "@/lib/utils/cn";

type VideoAspect = "mobile" | "square" | "landscape";

const ASPECTS: { value: VideoAspect; label: string; ratio: string; frame: string }[] = [
  { value: "mobile", label: "Mobile", ratio: "9:16", frame: "aspect-[9/16]" },
  { value: "square", label: "Square", ratio: "1:1", frame: "aspect-square" },
  { value: "landscape", label: "Landscape", ratio: "16:9", frame: "aspect-video" },
];

const RESULT_VIDEOS = [
  { src: "/videos/ciba-recap-brand.mp4", label: "Brand Recap" },
  { src: "/videos/ciba-recap-poster.mp4", label: "Poster Motion" },
  { src: "/videos/ciba-recap-terminal.mp4", label: "Kinetic Cut" },
];

const GEN_MS = 9000;
const TOTAL_MS = 16500;

type Phase = "idle" | "working" | "done";

function statusFor(elapsed: number): string {
  if (elapsed < 3000) return "Generating assets";
  if (elapsed < GEN_MS) return "Generating three videos";
  if (elapsed < 13000) return "Rendering frames";
  return "Finalizing your videos";
}

export function VideoPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [brief, setBrief] = useState("");
  const [aspect, setAspect] = useState<VideoAspect>("mobile");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (phase !== "working") return;
    startRef.current = Date.now();
    const t = setInterval(() => {
      const e = Date.now() - startRef.current;
      setElapsed(e);
      if (e >= TOTAL_MS) {
        setElapsed(TOTAL_MS);
        setPhase("done");
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  const frame = ASPECTS.find((a) => a.value === aspect)!.frame;
  const working = phase === "working";
  const progress = Math.min(100, (elapsed / TOTAL_MS) * 100);
  const seconds = Math.floor(elapsed / 1000);
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const submit = () => {
    if (!brief.trim() || working) return;
    setElapsed(0);
    setPhase("working");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create promotional videos</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <Label>Source assets</Label>
              <AssetUploader files={files} onChange={setFiles} disabled={working} />
            </div>
            <div>
              <Label htmlFor="video-brief">Describe your video</Label>
              <Textarea
                id="video-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                disabled={working}
                placeholder="A short recap of the CIBA AI for Business event: quick highlights, speaker moments, and a closing call to action…"
              />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label>Aspect ratio</Label>
              <div className="flex gap-2">
                {ASPECTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    disabled={working}
                    onClick={() => setAspect(a.value)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-md border py-2.5 transition-colors",
                      aspect === a.value
                        ? "border-river bg-river-tint text-river-deep"
                        : "border-line-strong bg-surface text-ink-soft hover:border-ink-faint"
                    )}
                  >
                    <span className="text-[13px] font-medium">{a.label}</span>
                    <span className="font-mono text-[11px] opacity-70">{a.ratio}</span>
                  </button>
                ))}
              </div>
              <FieldHint>Mobile is optimized for stories, reels, and vertical feeds.</FieldHint>
            </div>

            <div className="rounded-md border border-line bg-surface-tint/50 p-3.5 text-[13px] text-ink-soft">
              Three video variations are generated per brief, so you can choose the direction that
              fits the channel best.
            </div>

            <div className="flex justify-end">
              <Button
                onClick={submit}
                disabled={!brief.trim() || working}
                loading={working}
                icon={!working ? <Sparkles className="size-4" /> : undefined}
              >
                {working ? "Generating…" : "Generate videos"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Output */}
      {phase === "idle" ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface/60 py-16 text-center">
          <Clapperboard className="size-6 text-ink-faint" strokeWidth={1.5} />
          <p className="mt-3 max-w-sm px-6 text-[13px] text-ink-faint">
            Your generated videos appear here. Describe the video you want and generate three
            variations at once.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">
                {working ? "Generating your videos" : "Your videos"}
              </h2>
              {phase === "done" && (
                <span className="flex items-center gap-1 rounded-full bg-river-tint px-2 py-0.5 text-[11.5px] font-medium text-river-deep">
                  <Check className="size-3" /> 3 videos created
                </span>
              )}
            </div>
            {working && (
              <span className="font-mono text-[13px] tabular-nums text-ink-soft">{timer}</span>
            )}
          </div>

          {working && (
            <div className="space-y-2">
              <ProgressBar value={progress} />
              <p key={statusFor(elapsed)} className="animate-fade-in text-[13px] text-ink-soft">
                {statusFor(elapsed)}…
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {RESULT_VIDEOS.map((v, i) => (
              <VideoCard key={v.src} video={v} frame={frame} done={phase === "done"} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function VideoCard({
  video,
  frame,
  done,
  index,
}: {
  video: { src: string; label: string };
  frame: string;
  done: boolean;
  index: number;
}) {
  return (
    <figure className="group">
      <div className={cn("relative overflow-hidden rounded-lg border border-line bg-ink", frame)}>
        {done ? (
          <>
            <video
              src={video.src}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="absolute inset-0 h-full w-full object-cover"
            />
            <a
              href={video.src}
              download={`ciba-${video.label.toLowerCase().replace(/\s+/g, "-")}.mp4`}
              className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-md bg-white/90 text-ink opacity-0 shadow-1 transition-opacity duration-150 group-hover:opacity-100 hover:bg-white"
              aria-label={`Download ${video.label}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="size-4" />
            </a>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(110deg,#1a1d1c_40%,#232827_50%,#1a1d1c_60%)] bg-[length:200%_100%] animate-shimmer">
            <Loader2 className="size-5 animate-spin text-white/70" />
            <span className="text-[12px] text-white/70">Rendering variation {index + 1}</span>
          </div>
        )}
      </div>
      <figcaption className="mt-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft">{video.label}</span>
        {done && <span className="font-mono text-[10px] text-ink-faint">Ready</span>}
      </figcaption>
    </figure>
  );
}
