"use client";

import { useState } from "react";
import { Palette, Download, Trash2, Sparkles } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ALL_FORMATS, FORMAT_META, type PosterFormat } from "@/lib/os/marketing/poster";
import type { MarketingJob } from "@/lib/os/marketing/types";

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export function MarketingView({ jobs: initial, projects }: { jobs: MarketingJob[]; projects: { id: string; name: string }[] }) {
  const toast = useToast();
  const [jobs, setJobs] = useState<MarketingJob[]>(initial);
  const [eyebrow, setEyebrow] = useState("CIBA presents");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [cta, setCta] = useState("");
  const [projectId, setProjectId] = useState("");
  const [formats, setFormats] = useState<Set<PosterFormat>>(new Set(["instagram_post", "instagram_story"]));
  const [busy, setBusy] = useState(false);

  const toggle = (f: PosterFormat) => setFormats((prev) => { const n = new Set(prev); if (n.has(f)) n.delete(f); else n.add(f); return n; });

  const generate = async () => {
    if (!title.trim()) return toast("error", "Add a title or headline first.");
    if (formats.size === 0) return toast("error", "Choose at least one format.");
    setBusy(true);
    try {
      const res = await fetch("/api/os/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eyebrow, title, details, cta, projectId, formats: [...formats] }),
      });
      const data = await res.json();
      if (!res.ok) return toast("error", data.error ?? "Failed");
      setJobs((j) => [data.job, ...j]);
      setTitle("");
      setDetails("");
      setCta("");
      toast("success", "Posters generated.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/os/marketing/jobs/${id}`, { method: "DELETE" }).catch(() => {});
    setJobs((j) => j.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-6 fade-up">
      <PageHeader title="Marketing Studio" subtitle="Turn a short brief into on-brand CIBA posters, sized for every channel." icon={<Palette />} />

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="card p-5 space-y-4 lg:sticky lg:top-24">
          <p className="font-semibold">New asset</p>
          <div><label className="label">Eyebrow</label><input className="field" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="CIBA presents" /></div>
          <div><label className="label">Title / headline</label><textarea className="field min-h-16" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AI Skills Accelerator — Cohort 4 now open" /></div>
          <div><label className="label">Details (date / location)</label><input className="field" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Sept 18 · TRU Generator, Kamloops" /></div>
          <div><label className="label">Call to action</label><input className="field" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Apply at ciba.ca" /></div>
          {projects.length > 0 && (
            <div><label className="label">Collaboration (optional)</label>
              <select className="field" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Not linked</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Formats</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FORMATS.map((f) => (
                <button key={f} type="button" onClick={() => toggle(f)} className={`rounded-lg border px-2 py-2 text-[12px] font-medium transition ${formats.has(f) ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-muted hover:bg-bg"}`}>
                  {FORMAT_META[f].label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary w-full" disabled={busy} onClick={generate}>{busy ? <span className="spinner" /> : <Sparkles className="w-4 h-4" />} Generate posters</button>
        </div>

        <div className="space-y-5">
          {jobs.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">No assets yet. Describe an event or announcement and generate posters for every channel.</div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="card p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-sm">{job.title}</p>
                    <p className="text-[11px] text-muted">{new Date(job.createdAt).toLocaleString("en-CA")}</p>
                  </div>
                  <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => remove(job.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {job.outputs.map((o) => (
                    <div key={o.format} className="space-y-2">
                      <div className="rounded-lg border border-line overflow-hidden bg-bg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dataUri(o.svg)} alt={FORMAT_META[o.format].label} className="w-full h-auto block" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge tone="gray">{FORMAT_META[o.format].label}</Badge>
                        <a href={dataUri(o.svg)} download={`ciba-${o.format}.svg`} className="text-xs text-brand hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> SVG</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
