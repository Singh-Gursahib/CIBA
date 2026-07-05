"use client";

import { useEffect, useRef, useState } from "react";
import {
  FORMAT_META,
  PLATFORM_META,
  mediaUrl,
  type MediaFormat,
  type PlatformTarget,
  type SocialPlatform,
  type StudioPost,
} from "@/lib/os/social/types";

export interface ChannelVM {
  key: string;
  brand: string;
  blurb: string;
  platforms: { youtube: boolean; instagram: boolean };
}
interface ProjectVM {
  id: string;
  name: string;
}

const PLATFORM_ICON: Record<SocialPlatform, string> = { youtube: "▶", instagram: "◈" };
const ACTIVE = new Set(["rendering", "publishing"]);

const STATUS_PILL: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  rendering: "bg-blue-50 text-blue-700",
  ready: "bg-brand-soft text-brand-ink",
  publishing: "bg-blue-50 text-blue-700",
  published: "bg-brand-soft text-brand-ink",
  failed: "bg-red-50 text-red-700",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function SocialStudio({
  posts: initial,
  channels,
  projects,
  mockPublish,
  isExecutive,
}: {
  posts: StudioPost[];
  channels: ChannelVM[];
  projects: ProjectVM[];
  mockPublish: boolean;
  isExecutive: boolean;
}) {
  const [posts, setPosts] = useState<StudioPost[]>(initial);
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const upsert = (post: StudioPost) =>
    setPosts((prev) => {
      const i = prev.findIndex((p) => p.id === post.id);
      if (i === -1) return [post, ...prev];
      const next = [...prev];
      next[i] = post;
      return next;
    });

  const stop = (id: string) => {
    const t = timers.current.get(id);
    if (t) clearInterval(t);
    timers.current.delete(id);
  };
  const track = (id: string) => {
    stop(id);
    const tick = async () => {
      try {
        const res = await fetch(`/api/os/social/posts/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const { post } = (await res.json()) as { post: StudioPost };
        upsert(post);
        if (!ACTIVE.has(post.status)) stop(id);
      } catch {
        /* keep polling */
      }
    };
    void tick();
    timers.current.set(id, setInterval(tick, 1500));
  };
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearInterval);
      map.clear();
    };
  }, []);

  const onCreated = (post: StudioPost, needsRender: boolean) => {
    upsert(post);
    if (needsRender) {
      void fetch("/api/os/social/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      }).catch(() => {});
      track(post.id);
    }
  };

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Studio</h1>
          <p className="text-sm text-muted mt-1">
            Create short-form video and publish it to YouTube and Instagram
            {isExecutive ? " (executive view: all members' posts)." : "."}
          </p>
        </div>
        <span className={`pill ${mockPublish ? "opacity-70" : ""}`}>
          {mockPublish ? "○ demo — nothing published live" : "● live accounts"}
        </span>
      </div>

      <ChannelStats />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        <Composer channels={channels} projects={projects} mockPublish={mockPublish} onCreated={onCreated} />
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              No posts yet. Pick a channel, describe a video, and create your first draft.
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} onUpdate={upsert} onRemove={(id) => setPosts((x) => x.filter((q) => q.id !== id))} track={track} />)
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Composer ---------------- */

function Composer({
  channels,
  projects,
  mockPublish,
  onCreated,
}: {
  channels: ChannelVM[];
  projects: ProjectVM[];
  mockPublish: boolean;
  onCreated: (post: StudioPost, needsRender: boolean) => void;
}) {
  const [channelKey, setChannelKey] = useState(channels[0]?.key ?? "");
  const [brief, setBrief] = useState("");
  const [script, setScript] = useState("");
  const [format, setFormat] = useState<MediaFormat>("short");
  const [privacy, setPrivacy] = useState("private");
  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState<Set<SocialPlatform>>(new Set(["youtube"]));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const channel = channels.find((c) => c.key === channelKey) ?? channels[0];

  const toggle = (p: SocialPlatform) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const submit = async () => {
    setErr("");
    if (!brief.trim()) return setErr("Describe the video first.");
    if (selected.size === 0) return setErr("Choose at least one platform.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("channelKey", channelKey);
      fd.set("brief", brief.trim());
      fd.set("format", format);
      fd.set("privacy", privacy);
      if (projectId) fd.set("projectId", projectId);
      if (script.trim()) fd.set("script", script.trim());
      selected.forEach((p) => fd.append("platforms", p));
      if (file) fd.set("media", file);
      const res = await fetch("/api/os/social/create", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to create.");
        return;
      }
      onCreated(data.post, data.needsRender);
      setBrief("");
      setScript("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setErr("Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 lg:sticky lg:top-24">
      <p className="font-semibold">Create a post</p>

      <div>
        <label className="label">Channel</label>
        <div className="space-y-2">
          {channels.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setChannelKey(c.key)}
              className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                c.key === channelKey ? "border-brand bg-brand-soft" : "border-line hover:bg-bg"
              }`}
            >
              <span className="text-sm font-semibold">{c.brand}</span>
              <span className="block text-xs text-muted mt-0.5">{c.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {projects.length > 0 && (
        <div>
          <label className="label">Collaboration (optional)</label>
          <select className="field" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Not linked to a collaboration</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">What is the video about?</label>
        <textarea
          className="field min-h-20"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. The three closest title finishes in racing history"
        />
      </div>

      {!file && (
        <div>
          <label className="label">Narration script (optional)</label>
          <textarea
            className="field min-h-20"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write the voiceover, or leave empty and we draft one."
          />
        </div>
      )}

      <div>
        <label className="label">Format</label>
        <div className="flex gap-2">
          {(["short", "video"] as MediaFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                format === f ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-muted hover:bg-bg"
              }`}
            >
              {FORMAT_META[f].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Publish to</label>
        <div className="grid grid-cols-2 gap-2">
          {(["youtube", "instagram"] as SocialPlatform[]).map((p) => {
            const configured = channel?.platforms[p];
            const disabled = !mockPublish && !configured;
            const on = selected.has(p);
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => toggle(p)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  disabled ? "opacity-45 cursor-not-allowed border-line" : on ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-muted hover:bg-bg"
                }`}
              >
                {PLATFORM_ICON[p]} {PLATFORM_META[p].label}
              </button>
            );
          })}
        </div>
        {!mockPublish && <p className="text-[11px] text-muted mt-1.5">Greyed platforms have no credentials for this channel.</p>}
      </div>

      <div>
        <label className="label">Privacy</label>
        <select className="field" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
          <option value="private">Private (safe default)</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </div>

      <div>
        <label className="label">Media</label>
        <input ref={fileRef} type="file" accept="video/mp4,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => fileRef.current?.click()}>
            {file ? "Change file" : "Upload a video"}
          </button>
          <span className="text-xs text-muted truncate">{file ? file.name : "Optional — leave empty to auto-render."}</span>
        </div>
      </div>

      {err && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      <button className="btn btn-primary w-full" disabled={busy} onClick={submit}>
        {busy ? <span className="spinner" /> : "Create draft"}
      </button>
    </div>
  );
}

/* ---------------- Post card ---------------- */

function TargetChip({ t }: { t: PlatformTarget }) {
  const meta = PLATFORM_META[t.platform];
  const glyph = t.status === "published" ? "✓" : t.status === "failed" ? "✕" : t.status === "publishing" ? "…" : t.status === "skipped" ? "–" : "○";
  const color = t.status === "published" ? "text-brand" : t.status === "failed" ? "text-red-600" : "text-muted";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px]">
      <span>{PLATFORM_ICON[t.platform]}</span>
      <span className="font-medium">{meta.label}</span>
      <span className={color}>{glyph}</span>
      {t.url && t.status === "published" && (
        <a href={t.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
          open
        </a>
      )}
    </span>
  );
}

function PostCard({
  post,
  onUpdate,
  onRemove,
  track,
}: {
  post: StudioPost;
  onUpdate: (p: StudioPost) => void;
  onRemove: (id: string) => void;
  track: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [insights, setInsights] = useState<{ platform: SocialPlatform; metrics: { label: string; value: number }[] }[] | null>(null);

  const canPublish = !busy && post.mediaPath && ["ready", "published", "failed"].includes(post.status) && post.targets.some((t) => t.status !== "published");

  const publish = async () => {
    setBusy(true);
    track(post.id);
    try {
      const res = await fetch("/api/os/social/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id }) });
      const data = await res.json();
      if (data.post) onUpdate(data.post);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    await fetch(`/api/os/social/posts/${post.id}`, { method: "DELETE" }).catch(() => {});
    onRemove(post.id);
  };
  const loadInsights = async () => {
    const res = await fetch(`/api/os/social/posts/${post.id}/insights`, { cache: "no-store" });
    const data = await res.json();
    setInsights(data.insights ?? []);
  };

  return (
    <div className="card overflow-hidden">
      <div className="grid sm:grid-cols-[160px_1fr]">
        <div className="bg-bg grid place-items-center min-h-[120px]">
          {post.mediaPath ? (
            <video src={mediaUrl(post.mediaPath)} controls className="w-full h-full max-h-56 object-cover" />
          ) : post.status === "rendering" ? (
            <div className="p-4 text-center w-full">
              <p className="text-xs text-muted mb-2">{post.renderStage ?? "Rendering"}</p>
              <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${post.renderProgress ?? 0}%` }} />
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted p-4">No media yet</span>
          )}
        </div>

        <div className="p-4 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill">{post.channelBrand}</span>
            <span className="text-[11px] text-muted">{FORMAT_META[post.format].label}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[post.status]}`}>{post.status}</span>
          </div>

          <div>
            <p className="text-sm font-semibold">{post.title}</p>
            <p className="text-[13px] text-muted mt-0.5 line-clamp-2 whitespace-pre-line">{post.caption}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.slice(0, 6).map((h) => (
              <span key={h} className="text-[11px] text-brand">
                {h}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {post.targets.map((t) => (
              <TargetChip key={t.platform} t={t} />
            ))}
          </div>

          {post.error && post.status === "failed" && <p className="text-[11px] text-red-700 bg-red-50 rounded-lg px-3 py-2">{post.error}</p>}

          {insights && insights.length > 0 && (
            <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 space-y-1">
              {insights.map((ins) => (
                <div key={ins.platform} className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                  <span className="text-[11px] font-medium">
                    {PLATFORM_ICON[ins.platform]} {PLATFORM_META[ins.platform].label}
                  </span>
                  {ins.metrics.map((m) => (
                    <span key={m.label} className="text-[11px] text-muted">
                      <span className="font-semibold text-ink">{fmt(m.value)}</span> {m.label}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <button className="btn btn-primary !py-1.5 !px-3 text-xs" disabled={!canPublish} onClick={publish}>
              {busy ? <span className="spinner" /> : post.targets.some((t) => t.status === "published") ? "Publish remaining" : "Publish"}
            </button>
            {post.targets.some((t) => t.status === "published") && (
              <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={loadInsights}>
                Stats
              </button>
            )}
            <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={remove}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Channel stats strip ---------------- */

function ChannelStats() {
  const [stats, setStats] = useState<{ channelKey: string; brand: string; configured: boolean; subscribers?: number; views?: number; videoCount?: number; error?: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/os/social/stats", { cache: "no-store" });
      const data = await res.json();
      setStats(data.stats ?? []);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">Channel performance</span>
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs ml-auto" disabled={loading} onClick={load}>
          {loading ? <span className="spinner" /> : stats ? "Refresh" : "Load stats"}
        </button>
      </div>
      {!stats ? (
        <p className="text-xs text-muted mt-2">YouTube subscribers and views per channel. Loaded on demand.</p>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          {stats.map((s) => (
            <div key={s.channelKey} className="rounded-lg border border-line bg-bg/40 px-3 py-2.5">
              <p className="text-[13px] font-semibold">{s.brand}</p>
              {s.error ? (
                <p className="text-[11px] text-red-600 mt-1">{s.error}</p>
              ) : s.subscribers == null ? (
                <p className="text-[11px] text-muted mt-1">Not connected</p>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted mt-1.5">
                  <span>👥 {fmt(s.subscribers)}</span>
                  <span>👁 {fmt(s.views ?? 0)}</span>
                  <span>🎬 {fmt(s.videoCount ?? 0)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
