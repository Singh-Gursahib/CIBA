"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Landmark, FileText, Check, X, Sparkles, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { Badge, PageHeader, StatTile, Gauge, type Tone } from "@/components/ui";
import { useToast } from "@/components/toast";
import { readNdjson } from "@/lib/os/stream";
import type { Discovery, DiscoveryStatus, Funder, IntakeQuestion, ProposalMeta } from "@/lib/os/grants/types";

const STATUS_TONE: Record<DiscoveryStatus, Tone> = { new: "amber", seen: "gray", shortlisted: "brand", dismissed: "gray", proposal_started: "violet" };

export function GrantsView({ discoveries: initial, proposals, funders }: { discoveries: Discovery[]; proposals: ProposalMeta[]; funders: Funder[] }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"discoveries" | "proposals">("discoveries");
  const [discoveries, setDiscoveries] = useState<Discovery[]>(initial);
  const [wizard, setWizard] = useState<Discovery | null>(null);

  // After a scan (or any server refresh) the server component re-renders with a
  // fresh `initial`; useState ignores prop changes, so re-sync during render —
  // otherwise newly discovered opportunities don't appear until a full reload.
  // (React's recommended "adjust state when a prop changes" pattern.)
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setDiscoveries(initial);
  }

  const update = (d: Discovery) => setDiscoveries((prev) => prev.map((x) => (x.id === d.id ? d : x)));

  const active = discoveries.filter((d) => d.status !== "dismissed");
  const shortlisted = discoveries.filter((d) => d.status === "shortlisted").length;

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        title="Grants"
        subtitle="Locate open funding across CIBA's funders, score the fit, and build a funder-ready proposal."
        icon={<Landmark />}
      />

      <div className="grid sm:grid-cols-4 gap-4">
        <StatTile label="Opportunities found" value={discoveries.length} icon={<Search className="w-4 h-4" />} />
        <StatTile label="Shortlisted" value={shortlisted} tone="amber" icon={<Check className="w-4 h-4" />} />
        <StatTile label="Proposals" value={proposals.length} icon={<FileText className="w-4 h-4" />} />
        <StatTile label="Funders tracked" value={funders.length} icon={<Landmark className="w-4 h-4" />} />
      </div>

      <ScanPanel funders={funders} onDone={() => router.refresh()} />

      <div className="flex items-center gap-2">
        {(["discoveries", "proposals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-bg"}`}
          >
            {t === "discoveries" ? `Opportunities (${active.length})` : `Proposals (${proposals.length})`}
          </button>
        ))}
      </div>

      {tab === "discoveries" ? (
        active.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">No opportunities yet. Run a scan to find open funding.</div>
        ) : (
          <div className="grid gap-4">
            {active.map((d) => (
              <DiscoveryCard key={d.id} d={d} onUpdate={update} onDraft={() => setWizard(d)} toast={toast} />
            ))}
          </div>
        )
      ) : proposals.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">No proposals yet. Analyze an opportunity and draft one.</div>
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => (
            <Link key={p.slug} href={`/os/grants/proposals/${p.slug}`} className="card p-4 flex items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.title}</p>
                <p className="text-xs text-muted mt-0.5">{p.orgName ? `To ${p.orgName} · ` : ""}Updated {new Date(p.updatedAt).toLocaleDateString("en-CA")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={p.status === "exported" ? "green" : p.status === "in_review" ? "blue" : "gray"}>{p.status}</Badge>
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {wizard && <ProposalWizard discovery={wizard} onClose={() => setWizard(null)} />}
    </div>
  );
}

/* ---- scan panel ---- */
function ScanPanel({ funders, onDone }: { funders: Funder[]; onDone: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState<Record<string, { status: "pending" | "scanning" | "done"; found?: number; isNew?: number; error?: string }>>({});
  const [summary, setSummary] = useState("");

  const scan = async () => {
    setScanning(true);
    setSummary("");
    setRows(Object.fromEntries(funders.map((f) => [f.id, { status: "pending" as const }])));
    try {
      const res = await fetch("/api/os/grants/scan", { method: "POST" });
      await readNdjson(res, (e) => {
        if (e.type === "org_start") setRows((r) => ({ ...r, [e.orgId as string]: { status: "scanning" } }));
        else if (e.type === "org_done") setRows((r) => ({ ...r, [e.orgId as string]: { status: "done", found: e.found as number, isNew: e.isNew as number, error: e.error as string } }));
        else if (e.type === "scan_done") setSummary(`${e.newCount} new across ${e.checked} funders`);
      });
      onDone();
    } catch {
      setSummary("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-brand" /> Grant locator</p>
          <p className="text-xs text-muted mt-0.5">Scans {funders.length} funders for open opportunities that fit CIBA.</p>
        </div>
        <button className="btn btn-primary" disabled={scanning} onClick={scan}>
          {scanning ? <span className="spinner" /> : <Search className="w-4 h-4" />} {scanning ? "Scanning…" : "Scan for grants"}
        </button>
      </div>
      {Object.keys(rows).length > 0 && (
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          {funders.map((f) => {
            const r = rows[f.id];
            return (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-muted flex items-center gap-1.5">
                  {!r || r.status === "pending" ? "queued" : r.status === "scanning" ? <><Loader2 className="w-3 h-3 animate-spin" /> scanning</> : r.error ? <span className="text-red-600">error</span> : <>{r.found} found · <b className="text-brand-ink">{r.isNew} new</b></>}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {summary && <p className="mt-3 text-xs font-medium text-brand-ink">{summary}</p>}
    </div>
  );
}

/* ---- discovery card ---- */
function DiscoveryCard({ d, onUpdate, onDraft, toast }: { d: Discovery; onUpdate: (d: Discovery) => void; onDraft: () => void; toast: (k: "success" | "error" | "info", m: string) => void }) {
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/os/grants/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discoveryId: d.id }) });
      const data = await res.json();
      if (data.discovery) onUpdate(data.discovery);
      else toast("error", data.error ?? "Analysis failed");
    } finally {
      setBusy(false);
    }
  };
  const setStatus = async (status: DiscoveryStatus) => {
    const res = await fetch(`/api/os/grants/discoveries/${d.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.discovery) onUpdate(data.discovery);
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={STATUS_TONE[d.status]}>{d.status === "proposal_started" ? "proposal started" : d.status}</Badge>
            <span className="text-xs text-muted">{d.orgName}</span>
            {d.amount && <span className="text-xs text-muted">· {d.amount}</span>}
            {d.deadline && <span className="text-xs text-muted">· due {d.deadline}</span>}
          </div>
          <p className="font-semibold mt-1.5">{d.title}</p>
          <p className="text-sm text-muted mt-1">{d.summary}</p>
          {d.eligibility && <p className="text-xs text-muted mt-1"><span className="font-medium">Eligibility:</span> {d.eligibility}</p>}
          {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline inline-flex items-center gap-1 mt-1">Funder page <ExternalLink className="w-3 h-3" /></a>}
        </div>
        {d.fit && (
          <div className="shrink-0 text-center">
            <Gauge value={d.fit.score} size={72} label="fit" />
          </div>
        )}
      </div>

      {d.fit && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3 rounded-lg border border-line bg-bg/40 p-3">
          <div className="sm:col-span-2 text-sm text-ink/80">{d.fit.rationale}</div>
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Strengths</p>
            <ul className="text-xs text-ink/80 space-y-0.5">{d.fit.strengths.map((s, i) => <li key={i}>+ {s}</li>)}</ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Gaps</p>
            <ul className="text-xs text-ink/80 space-y-0.5">{d.fit.gaps.map((s, i) => <li key={i}>• {s}</li>)}</ul>
          </div>
          {d.fit.relatedRefs.length > 0 && (
            <div className="sm:col-span-2 flex flex-wrap gap-1.5 pt-1">
              {d.fit.relatedRefs.map((r) => (r.href ? <Link key={r.id} href={r.href} className="pill hover:opacity-80">{r.label}</Link> : <span key={r.id} className="pill">{r.label}</span>))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {!d.fit && (
          <button className="btn btn-primary !py-1.5 !px-3 text-xs" disabled={busy} onClick={analyze}>
            {busy ? <span className="spinner" /> : <Sparkles className="w-3.5 h-3.5" />} Analyze fit
          </button>
        )}
        <button className="btn btn-primary !py-1.5 !px-3 text-xs" onClick={onDraft}>
          <FileText className="w-3.5 h-3.5" /> Draft proposal
        </button>
        {d.status !== "shortlisted" && <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setStatus("shortlisted")}><Check className="w-3.5 h-3.5" /> Shortlist</button>}
        <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setStatus("dismissed")}><X className="w-3.5 h-3.5" /> Dismiss</button>
      </div>
    </div>
  );
}

/* ---- proposal wizard ---- */
function ProposalWizard({ discovery, onClose }: { discovery: Discovery; onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "questions" | "generating">("loading");
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch("/api/os/proposals/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discoveryId: discovery.id }) })
      .then((r) => r.json())
      .then((d) => { setQuestions(d.questions ?? []); setPhase("questions"); })
      .catch(() => setPhase("questions"));
  }, [discovery.id]);

  const generate = async () => {
    setPhase("generating");
    try {
      const res = await fetch("/api/os/proposals/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discoveryId: discovery.id, answers }) });
      const data = await res.json();
      if (data.slug) router.push(`/os/grants/proposals/${data.slug}`);
      else onClose();
    } catch {
      onClose();
    }
  };

  const q = questions[step];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold">Draft proposal</p>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted mb-4">{discovery.title} · {discovery.orgName}</p>

        {phase === "loading" && <div className="py-10 text-center text-sm text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Preparing intake questions…</div>}
        {phase === "generating" && <div className="py-10 text-center text-sm text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Writing the proposal…</div>}

        {phase === "questions" && q && (
          <div>
            <div className="flex gap-1 mb-3">{questions.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />)}</div>
            <label className="label">{q.question}</label>
            {q.inputType === "textarea" ? (
              <textarea className="field min-h-24" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder={q.hint} autoFocus />
            ) : (
              <input className="field" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder={q.hint} autoFocus />
            )}
            <div className="flex items-center justify-between mt-4">
              <button className="btn btn-ghost !py-1.5 !px-3 text-xs" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
              {step < questions.length - 1 ? (
                <button className="btn btn-primary !py-1.5 !px-3 text-xs" onClick={() => setStep((s) => s + 1)}>Next</button>
              ) : (
                <button className="btn btn-primary !py-1.5 !px-3 text-xs" onClick={generate}><Sparkles className="w-3.5 h-3.5" /> Generate proposal</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
