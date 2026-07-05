"use client";

import { useState } from "react";
import { STAGES } from "@/lib/ciba";
import { MENTORS } from "@/lib/mentors";
import type { MatchResult } from "@/lib/schemas";

const EXAMPLE = {
  founderSummary:
    "TrailheadIQ — booking + trail-conditions software for backcountry tour operators. ~$1.4k MRR across 3 pilots, waitlist of 40. Uses AI to summarize trail reports and predict cancellations.",
  stage: "growth",
  industry: "SaaS / Tourism",
  need: "Repeatable sales across BC and an AI product roadmap.",
};

const capacityStyle: Record<string, React.CSSProperties> = {
  open: { background: "#e6f2ee", color: "#0a3f33" },
  limited: { background: "#fbeadd", color: "#a5541f" },
  full: { background: "#f4e3e3", color: "#8f2f2f" },
};

export default function DashboardPage() {
  const [form, setForm] = useState({ founderSummary: "", stage: "validation", industry: "", need: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");

  const matchById = (id: string) => result?.matches.find((m) => m.mentorId === id);
  const rankById = (id: string) => {
    const idx = result?.matches.findIndex((m) => m.mentorId === id) ?? -1;
    return idx >= 0 ? idx + 1 : null;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data.result);
      setMode(data.mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Sort mentors so matched ones float to the top in ranked order.
  const sortedMentors = [...MENTORS].sort((a, b) => {
    const ra = rankById(a.id) ?? 99;
    const rb = rankById(b.id) ?? 99;
    return ra - rb;
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">For CIBA staff</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Mentor Matching</h1>
        <p className="mt-2 text-muted max-w-2xl">
          Describe a founder and their need. The engine ranks CIBA&apos;s mentor network by industry, stage, and
          expertise fit — with a reason and an honest caveat for each pairing.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_1.4fr] gap-6 items-start">
        {/* Matching form */}
        <form onSubmit={submit} className="card p-6 space-y-4 lg:sticky lg:top-24">
          <div>
            <label className="label">Founder / venture summary *</label>
            <textarea className="field min-h-28" required value={form.founderSummary}
              onChange={(e) => setForm({ ...form, founderSummary: e.target.value })}
              placeholder="Paste from the intake brief or describe the venture." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Stage</label>
              <select className="field" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Industry</label>
              <input className="field" value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="SaaS / Tourism" />
            </div>
          </div>
          <div>
            <label className="label">Most needs help with</label>
            <input className="field" value={form.need}
              onChange={(e) => setForm({ ...form, need: e.target.value })} placeholder="Repeatable sales, fundraising…" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Matching…</> : "Rank mentors"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(EXAMPLE)} disabled={loading}>
              Fill example
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {mode && (
            <p className="text-[11px] text-muted uppercase tracking-wide">
              {mode.startsWith("ai") ? "Ranked by Claude" : "Ranked by demo engine"}
            </p>
          )}
        </form>

        {/* Mentor roster */}
        <div className="space-y-3">
          {sortedMentors.map((m) => {
            const match = matchById(m.id);
            const rank = rankById(m.id);
            return (
              <div key={m.id}
                className={`card p-5 transition-all ${match ? "ring-2 ring-brand/40 fade-up" : result ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {rank && (
                      <span className="grid place-items-center w-7 h-7 rounded-full bg-brand text-white text-sm font-bold shrink-0">
                        {rank}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold leading-tight">{m.name}</p>
                      <p className="text-sm text-muted">{m.title} · {m.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {match && (
                      <span className="text-sm font-bold text-brand">{match.score}%</span>
                    )}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={capacityStyle[m.capacity]}>
                      {m.capacity}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.expertise.slice(0, 4).map((e) => (
                    <span key={e} className="text-[11px] px-2 py-0.5 rounded-full bg-bg border border-line text-muted">{e}</span>
                  ))}
                </div>

                {match ? (
                  <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                    <p className="text-sm"><span className="font-semibold text-brand-ink">Why: </span>{match.why}</p>
                    <p className="text-sm text-muted"><span className="font-semibold">Watch out: </span>{match.watchout}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">{m.bio}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
