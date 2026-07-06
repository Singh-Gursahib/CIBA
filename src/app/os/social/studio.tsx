"use client";

import { useEffect, useRef, useState } from "react";
import {
  ALL_PLATFORMS,
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
  platforms: Record<SocialPlatform, boolean>;
}
interface ProjectVM {
  id: string;
  name: string;
}

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
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  const refreshAll = async () => {
    const res = await fetch("/api/os/social/posts", { cache: "no-store" });
    if (res.ok) setPosts((await res.json()).posts ?? []);
  };

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

  const pendingApprovals = posts.filter((p) => p.approval === "pending").length;

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Studio</h1>
          <p className="text-sm text-muted mt-1">
            Create short-form video and publish it to YouTube, Instagram, and TikTok
            {isExecutive ? " (executive view: all members' posts + approvals)." : "."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isExecutive && pendingApprovals > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
              {pendingApprovals} awaiting approval
            </span>
          )}
          <span className={`pill ${mockPublish ? "opacity-70" : ""}`}>
            {mockPublish ? "○ demo — nothing published live" : "● live accounts"}
          </span>
        </div>
      </div>

      <Calendar posts={posts} onRan={refreshAll} />
      <ChannelStats />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        <Composer channels={channels} projects={projects} mockPublish={mockPublish} onCreated={onCreated} />
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              No posts yet. Pick a channel, describe a video, and create your first draft.
            </div>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                isExecutive={isExecutive}
                onUpdate={upsert}
                onRemove={(id) => setPosts((x) => x.filter((q) => q.id !== id))}
                track={track}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Calendar ---------------- */

function Calendar({ posts, onRan }: { posts: StudioPost[]; onRan: () => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [running, setRunning] = useState(false);

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthLabel = first.toLocaleString("en-CA", { month: "long", year: "numeric" });
  const nowIso = new Date().toISOString();

  const dayKey = (p: StudioPost) => (p.scheduledFor || p.publishedAt || p.createdAt).slice(0, 10);
  const byDay: Record<string, StudioPost[]> = {};
  for (const p of posts) {
    const k = dayKey(p);
    (byDay[k] ??= []).push(p);
  }
  const dueCount = posts.filter(
    (p) => p.scheduledFor && p.scheduledFor <= nowIso && p.approval === "approved" && p.mediaPath && p.targets.some((t) => t.status !== "published"),
  ).length;

  const runDue = async () => {
    setRunning(true);
    try {
      await fetch("/api/os/social/run-scheduled", { method: "POST" });
      onRan();
    } finally {
      setRunning(false);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellColor = (p: StudioPost) =>
    p.status === "published" ? "bg-brand" : p.scheduledFor ? "bg-accent" : "bg-gray-300";

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm">📅 Content calendar</span>
        <div className="flex items-center gap-1 ml-2">
          <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>
            ‹
          </button>
          <span className="text-xs font-medium text-muted w-32 text-center">{monthLabel}</span>
          <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>
            ›
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-muted flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-accent" /> scheduled <span className="inline-block w-2 h-2 rounded-full bg-brand ml-2" /> published</span>
          <button className="btn btn-primary !py-1.5 !px-3 text-xs" disabled={running || dueCount === 0} onClick={runDue}>
            {running ? <span className="spinner" /> : `Publish due (${dueCount})`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mt-3">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted py-1">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const dayPosts = byDay[key] ?? [];
          return (
            <div key={i} className="min-h-[52px] rounded-lg border border-line p-1" title={dayPosts.map((p) => p.title).join("\n")}>
              <p className="text-[10px] text-muted">{d}</p>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {dayPosts.slice(0, 4).map((p) => (
                  <span key={p.id} className={`inline-block w-1.5 h-1.5 rounded-full ${cellColor(p)}`} />
                ))}
              </div>
            </div>
          );
        })}
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
  const [scheduledFor, setScheduledFor] = useState("");
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
      if (scheduledFor) fd.set("scheduledFor", scheduledFor);
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
      setScheduledFor("");
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
        <div className="grid grid-cols-3 gap-2">
          {ALL_PLATFORMS.map((p) => {
            const configured = channel?.platforms[p];
            const disabled = !mockPublish && !configured;
            const on = selected.has(p);
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => toggle(p)}
                className={`rounded-lg border px-2 py-2 text-[13px] font-medium transition ${
                  disabled ? "opacity-45 cursor-not-allowed border-line" : on ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-muted hover:bg-bg"
                }`}
              >
                {PLATFORM_META[p].icon} {PLATFORM_META[p].label}
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
        <label className="label">Schedule (optional)</label>
        <input type="datetime-local" className="field" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
        <p className="text-[11px] text-muted mt-1">Leave empty to publish manually once approved.</p>
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
      <span>{meta.icon}</span>
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
  isExecutive,
  onUpdate,
  onRemove,
  track,
}: {
  post: StudioPost;
  isExecutive: boolean;
  onUpdate: (p: StudioPost) => void;
  onRemove: (id: string) => void;
  track: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [insights, setInsights] = useState<{ platform: SocialPlatform; metrics: { label: string; value: number }[] }[] | null>(null);

  const approved = post.approval === "approved";
  const hasMedia = Boolean(post.mediaPath);
  const anyToPublish = post.targets.some((t) => t.status !== "published");
  const canPublish = !busy && hasMedia && approved && anyToPublish && ["ready", "published", "failed"].includes(post.status);

  const call = async (url: string, body?: object) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json();
      if (data.post) onUpdate(data.post);
      return data;
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    track(post.id);
    await call("/api/os/social/publish", { postId: post.id });
  };
  const approve = () => call(`/api/os/social/posts/${post.id}/approve`, { decision: "approve" });
  const reject = () => {
    const reason = window.prompt("Reason for rejection (optional):") ?? "";
    return call(`/api/os/social/posts/${post.id}/approve`, { decision: "reject", reason });
  };
  const remove = async () => {
    await fetch(`/api/os/social/posts/${post.id}`, { method: "DELETE" }).catch(() => {});
    onRemove(post.id);
  };
  const loadInsights = async () => {
    const res = await fetch(`/api/os/social/posts/${post.id}/insights`, { cache: "no-store" });
    setInsights((await res.json()).insights ?? []);
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
            {post.approval === "pending" && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">awaiting approval</span>}
            {post.approval === "approved" && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand-ink">approved</span>}
            {post.approval === "rejected" && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">rejected</span>}
            {post.scheduledFor && <span className="text-[11px] text-muted">🕐 {fmtDate(post.scheduledFor)}</span>}
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

          {post.approval === "rejected" && post.rejectionReason && (
            <p className="text-[11px] text-red-700 bg-red-50 rounded-lg px-3 py-2">Rejected: {post.rejectionReason}</p>
          )}
          {post.error && post.status === "failed" && <p className="text-[11px] text-red-700 bg-red-50 rounded-lg px-3 py-2">{post.error}</p>}

          {insights && insights.length > 0 && (
            <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 space-y-1">
              {insights.map((ins) => (
                <div key={ins.platform} className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                  <span className="text-[11px] font-medium">
                    {PLATFORM_META[ins.platform].icon} {PLATFORM_META[ins.platform].label}
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

          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            {isExecutive && post.approval === "pending" && (
              <>
                <button className="btn btn-primary !py-1.5 !px-3 text-xs" disabled={busy} onClick={approve}>
                  {busy ? <span className="spinner" /> : "Approve"}
                </button>
                <button className="btn btn-ghost !py-1.5 !px-3 text-xs" disabled={busy} onClick={reject}>
                  Reject
                </button>
              </>
            )}
            <button className="btn btn-primary !py-1.5 !px-3 text-xs" disabled={!canPublish} onClick={publish}>
              {busy && approved ? <span className="spinner" /> : !approved ? "Awaiting approval" : post.scheduledFor ? "Publish now" : post.targets.some((t) => t.status === "published") ? "Publish remaining" : "Publish"}
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
      setStats((await res.json()).stats ?? []);
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
