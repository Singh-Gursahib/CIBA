"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PROGRAMS, SERVICE_AREAS, STAGES } from "@/lib/ciba";
import type { TriageResult } from "@/lib/schemas";

const EXAMPLE = {
  name: "Jordan Pruden",
  company: "TrailheadIQ",
  location: "Kamloops, BC",
  pitch:
    "We build a booking + trail-conditions app for backcountry tour operators. Operators currently juggle phone calls, spreadsheets, and paper waivers. We use AI to auto-summarize daily trail reports and predict cancellations.",
  traction: "3 paying operators on a monthly plan, ~$1.4k MRR, 40 more on a waitlist after a local trade show.",
  ask: "Help getting from a handful of pilots to repeatable sales across BC, and figuring out our AI roadmap.",
};

const stageName = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id;
const areaName = (id: string) => SERVICE_AREAS.find((s) => s.id === id)?.name ?? id;
const programById = (id: string) => PROGRAMS.find((p) => p.id === id);

function ReadinessGauge({ value }: { value: number }) {
  const color = value >= 70 ? "#0f5c4a" : value >= 45 ? "#e07a2f" : "#b23b3b";
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold" style={{ color }}>
          {value}
        </span>
        <span className="text-muted text-sm">/ 100 accelerator-readiness</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-line overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function IntakePage() {
  const [form, setForm] = useState({ name: "", company: "", location: "", pitch: "", traction: "", ask: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [mode, setMode] = useState<string>("");
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/triage", {
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

  const program = result ? programById(result.recommendedProgram) : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">For founders · public</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Founder Intake &amp; Triage</h1>
        <p className="mt-2 text-muted max-w-2xl">
          Tell us about your venture. We&apos;ll assess your stage, score your readiness, and point you to the
          right CIBA support — and hand our team a brief so your first call starts warm.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Your name</label>
              <input className="field" value={form.name} onChange={set("name")} required placeholder="Jordan Pruden" />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="field" value={form.company} onChange={set("company")} required placeholder="TrailheadIQ" />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="field" value={form.location} onChange={set("location")} placeholder="Kamloops, BC" />
          </div>
          <div>
            <label className="label">What does your business do? *</label>
            <textarea className="field min-h-28" value={form.pitch} onChange={set("pitch")} required
              placeholder="The problem you solve, for whom, and how." />
          </div>
          <div>
            <label className="label">Traction so far</label>
            <textarea className="field min-h-20" value={form.traction} onChange={set("traction")}
              placeholder="Revenue, customers, pilots, waitlist, or 'just an idea'." />
          </div>
          <div>
            <label className="label">What do you want help with?</label>
            <textarea className="field min-h-20" value={form.ask} onChange={set("ask")}
              placeholder="Your biggest challenge or ask for CIBA." />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Assessing…</> : "Assess my venture"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(EXAMPLE)} disabled={loading}>
              Fill example
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Result */}
        <div className="lg:sticky lg:top-24">
          {!result && !loading && (
            <div className="card p-8 text-center text-muted border-dashed">
              <p className="text-sm">Your assessment will appear here.</p>
              <p className="text-xs mt-1">Tip: click &ldquo;Fill example&rdquo; to see a full result instantly.</p>
            </div>
          )}
          {loading && (
            <div className="card p-8 text-center text-muted">
              <div className="mx-auto w-6 h-6 rounded-full border-2 border-line border-t-brand animate-spin" />
              <p className="text-sm mt-3">Reading your pitch…</p>
            </div>
          )}
          {result && (
            <div className="card p-6 space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <span className="pill">Stage: {stageName(result.stage)}</span>
                <span className="text-[11px] text-muted uppercase tracking-wide">
                  {mode.startsWith("ai") ? "Claude assessment" : "demo mode"}
                </span>
              </div>

              <ReadinessGauge value={result.readiness} />

              <p className="text-sm text-ink/80">{result.summary}</p>

              <div>
                <p className="label">Best-fit CIBA program</p>
                <div className="rounded-xl bg-accent-soft/60 border border-accent/20 p-4">
                  <p className="font-semibold text-ink">{program?.name ?? result.recommendedProgram}</p>
                  {program && <p className="text-sm text-muted mt-1">{program.format}</p>}
                </div>
              </div>

              <div>
                <p className="label">Relevant service areas</p>
                <div className="flex flex-wrap gap-2">
                  {result.serviceAreas.map((a) => (
                    <span key={a} className="pill">{areaName(a)}</span>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="label text-brand-ink">Strengths</p>
                  <ul className="text-sm space-y-1 text-ink/80">
                    {result.strengths.map((s, i) => <li key={i} className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand" /> {s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="label" style={{ color: "#b23b3b" }}>Gaps to probe</p>
                  <ul className="text-sm space-y-1 text-ink/80">
                    {result.gaps.map((g, i) => <li key={i}>• {g}</li>)}
                  </ul>
                </div>
              </div>

              <div>
                <p className="label">Staff brief (internal)</p>
                <pre className="text-xs whitespace-pre-wrap font-sans bg-bg rounded-lg p-3 border border-line text-ink/80">
{result.staffBrief}
                </pre>
              </div>

              <div>
                <p className="label">Your next steps</p>
                <ol className="text-sm space-y-1 text-ink/80 list-decimal list-inside">
                  {result.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
