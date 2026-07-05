"use client";

import { useRef, useState, useTransition } from "react";
import { MonitorPlay, Camera, Upload, Sparkles, Film } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea, FieldHint } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { createPost } from "@/features/social/actions";
import { FORMAT_META, type MediaFormat, type SocialPlatform, type SocialPost } from "@/types/social";

export interface ChannelVM {
  key: string;
  brand: string;
  blurb: string;
  platforms: { youtube: boolean; instagram: boolean };
}

const PLATFORM_INFO: { platform: SocialPlatform; label: string; icon: typeof MonitorPlay }[] = [
  { platform: "youtube", label: "YouTube", icon: MonitorPlay },
  { platform: "instagram", label: "Instagram", icon: Camera },
];

export function PostComposer({
  channels,
  mockMode,
  onCreated,
}: {
  channels: ChannelVM[];
  mockMode: boolean;
  onCreated: (post: SocialPost, needsRender: boolean) => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [channelKey, setChannelKey] = useState(channels[0]?.key ?? "");
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<MediaFormat>("short");
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [selected, setSelected] = useState<Set<SocialPlatform>>(new Set(["youtube"]));
  const [file, setFile] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const channel = channels.find((c) => c.key === channelKey) ?? channels[0];

  const togglePlatform = (p: SocialPlatform) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const submit = () => {
    if (!brief.trim()) {
      toast("error", "Describe the video you want to post first.");
      return;
    }
    if (selected.size === 0) {
      toast("error", "Choose at least one platform.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("channelKey", channelKey);
      fd.set("brief", brief.trim());
      fd.set("format", format);
      fd.set("privacy", privacy);
      selected.forEach((p) => fd.append("platforms", p));
      if (script.trim()) fd.set("script", script.trim());
      if (file) fd.set("media", file);

      const result = await createPost(fd);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      // Fetch the freshly created post to render its card.
      const res = await fetch(`/api/social/posts/${result.postId}`, { cache: "no-store" });
      const data = (await res.json()) as { post: SocialPost };
      onCreated(data.post, result.needsRender);
      toast("success", result.needsRender ? "Draft created, rendering media…" : "Draft created, ready to publish.");
      setBrief("");
      setScript("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Sparkles className="size-4 text-river" strokeWidth={1.75} />
        <CardTitle>Create a post</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div>
          <Label>Channel</Label>
          <div className="grid gap-2 sm:grid-cols-1">
            {channels.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setChannelKey(c.key)}
                className={cn(
                  "flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition-colors",
                  c.key === channelKey
                    ? "border-river bg-river-tint"
                    : "border-line-strong hover:border-ink-faint hover:bg-surface-tint"
                )}
              >
                <span className="text-[13.5px] font-semibold text-ink">{c.brand}</span>
                <span className="mt-0.5 text-xs text-ink-soft">{c.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="brief">What is the video about?</Label>
          <Textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. The three closest title finishes in racing history"
            className="min-h-20"
          />
          <FieldHint>We generate the title, description, caption, and hashtags for you.</FieldHint>
        </div>

        {!file && (
          <div>
            <Label htmlFor="script">Narration script (optional)</Label>
            <Textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Write the voiceover the way you want it read. Leave empty and we draft one for you."
              className="min-h-20"
            />
            <FieldHint>Used for the auto-render (Edge voiceover + stock footage). Ignored when you upload a file.</FieldHint>
          </div>
        )}

        <div>
          <Label>Format</Label>
          <Tabs<MediaFormat>
            value={format}
            onChange={setFormat}
            items={[
              { value: "short", label: FORMAT_META.short.label, icon: <Film className="size-3.5" /> },
              { value: "video", label: FORMAT_META.video.label, icon: <Film className="size-3.5" /> },
            ]}
          />
        </div>

        <div>
          <Label>Publish to</Label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORM_INFO.map(({ platform, label, icon: Icon }) => {
              const configured = channel?.platforms[platform];
              const disabled = !mockMode && !configured;
              const on = selected.has(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  disabled={disabled}
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
                    disabled && "cursor-not-allowed opacity-50",
                    on && !disabled
                      ? "border-river bg-river-tint text-river-deep"
                      : "border-line-strong text-ink-soft hover:border-ink-faint hover:bg-surface-tint"
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                </button>
              );
            })}
          </div>
          {!mockMode && (
            <FieldHint>Greyed-out platforms have no credentials set for this channel.</FieldHint>
          )}
        </div>

        <div>
          <Label htmlFor="privacy">Privacy</Label>
          <select
            id="privacy"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
            className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink hover:border-ink-faint focus:border-river focus:outline-none focus:ring-2 focus:ring-river/15"
          >
            <option value="private">Private (safe default)</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div>
          <Label>Media</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Upload className="size-4" />}
              onClick={() => fileRef.current?.click()}
            >
              {file ? "Change file" : "Upload a video"}
            </Button>
            <span className="truncate text-xs text-ink-faint">
              {file ? file.name : "Optional. Leave empty to auto-render."}
            </span>
          </div>
        </div>

        <Button className="w-full" loading={pending} onClick={submit} icon={<Sparkles className="size-4" />}>
          Create draft
        </Button>
      </CardBody>
    </Card>
  );
}
