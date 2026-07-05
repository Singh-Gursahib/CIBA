"use client";

import { useState } from "react";
import type { ReadinessResult } from "@/lib/schemas";

const QUESTIONS = [
  {
    key: "repetitive_work",
    q: "What repetitive task eats the most staff time each week?",
    placeholder: "e.g. answering the same customer emails, re-typing invoices, writing quotes",
  },
  {
    key: "data_location",
    q: "Where does your business information mostly live?",
    placeholder: "e.g. spreadsheets, a CRM, paper, QuickBooks, all over the place",
  },
  {
    key: "customer_volume",
    q: "How do customers reach you, and how many per week?",
    placeholder: "e.g. ~50 emails + phone calls a week, mostly the same questions",
  },
  {
    key: "ai_today",
    q: "Are you using any AI tools today? If so, which?",
    placeholder: "e.g. not yet / we use ChatGPT sometimes / nothing formal",
  },
  {
    key: "goal",
    q: "If you could wave a wand and automate ONE thing, what would it be?",
    placeholder: "e.g. never write another quote from scratch",
  },
] as const;

const impactColor: Record<string, string> = { high: "#0f5c4a", medium: "#e07a2f", low: "#8a978f" };

function Chip({ label, level }: { label: string; level: string }) {
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${impactColor[level]}22`, color: impactColor[level] }}
    >
      {label}: {level}
    </span>
  );
}

export default function AIReadinessPage() {
  const [meta, setMeta] = useState({ business: "", industry: "", teamSize: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/ai-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, answers }),
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

  const bandColor = result
    ? result.band === "Accelerating"
      ? "#0f5c4a"
      : result.band === "Ready"
        ? "#e07a2f"
        : "#8a978f"
    : "#8a978f";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">For local businesses · public</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Is your business ready for AI?</h1>
        <p className="mt-2 text-muted">
          Five plain questions. Get a practical report — the real AI wins for a business like yours, ranked by
          effort and impact, with a recommended first project. Powered by CIBA&apos;s AI Skills Accelerator.
        </p>
      </div>

      {!result && (
        <form onSubmit={submit} className="card p-6 space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="label">Business name *</label>
              <input className="field" required value={meta.business}
                onChange={(e) => setMeta({ ...meta, business: e.target.value })} placeholder="Ridgeline Roofing" />
            </div>
            <div>
              <label className="label">Industry</label>
              <input className="field" value={meta.industry}
                onChange={(e) => setMeta({ ...meta, industry: e.target.value })} placeholder="Construction" />
            </div>
            <div>
              <label className="label">Team size</label>
              <input className="field" value={meta.teamSize}
                onChange={(e) => setMeta({ ...meta, teamSize: e.target.value })} placeholder="12" />
            </div>
          </div>

          {QUESTIONS.map((item, i) => (
            <div key={item.key}>
              <label className="label">
                {i + 1}. {item.q}
              </label>
              <textarea
                className="field min-h-16"
                value={answers[item.key] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.value })}
                placeholder={item.placeholder}
              />
            </div>
          ))}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Analyzing…</> : "Get my AI opportunity report"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {result && (
        <div className="space-y-5 fade-up">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted uppercase tracking-wide">
                {mode.startsWith("ai") ? "Claude assessment" : "demo mode"}
              </span>
              <span className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{ background: `${bandColor}22`, color: bandColor }}>
                {result.band}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-5xl font-bold" style={{ color: bandColor }}>{result.score}</span>
              <span className="text-muted">/ 100 AI-readiness</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-line overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${result.score}%`, background: bandColor }} />
            </div>
            <p className="mt-4 text-lg font-medium">{result.headline}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Your top AI opportunities</h2>
            <div className="space-y-3">
              {result.opportunities.map((o, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{i + 1}. {o.title}</h3>
                    <div className="flex gap-1.5 shrink-0">
                      <Chip label="Impact" level={o.impact} />
                      <Chip label="Effort" level={o.effort} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted"><span className="font-semibold text-ink/70">The pain: </span>{o.problem}</p>
                  <p className="mt-1 text-sm text-muted"><span className="font-semibold text-ink/70">With AI: </span>{o.solution}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 bg-accent-soft/50 border-accent/20">
            <p className="label text-accent">Start here</p>
            <p className="text-sm text-ink/90">{result.firstProject}</p>
            <p className="mt-4 pt-4 border-t border-accent/20 text-sm font-medium text-brand-ink">
              {result.cibaHook}
            </p>
          </div>

          <button className="btn btn-ghost" onClick={() => { setResult(null); }}>
            ← Assess another business
          </button>
        </div>
      )}
    </div>
  );
}
