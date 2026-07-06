"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, History, Wand2, Loader2, Check, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { ProposalMeta } from "@/lib/os/grants/types";

type SaveState = "idle" | "saving" | "saved";

export function ProposalEditor({ slug, meta, initial }: { slug: string; meta: ProposalMeta; initial: string }) {
  const toast = useToast();
  const [content, setContent] = useState(initial);
  const [view, setView] = useState<"split" | "preview">("split");
  const [save, setSave] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<{ id: string; savedAt: string }[] | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (text: string) => {
    setSave("saving");
    await fetch(`/api/os/proposals/${slug}/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) }).catch(() => {});
    setSave("saved");
  }, [slug]);

  const onChange = (text: string) => {
    setContent(text);
    setSave("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(text), 1200);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const rewrite = async (scope: "selection" | "document", instruction: string) => {
    const ta = taRef.current;
    let target = content;
    let range: [number, number] | null = null;
    if (scope === "selection" && ta && ta.selectionEnd > ta.selectionStart) {
      range = [ta.selectionStart, ta.selectionEnd];
      target = content.slice(range[0], range[1]);
    } else if (scope === "selection") {
      toast("info", "Select some text first to rewrite it.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/os/proposals/${slug}/rewrite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, text: target, instruction }) });
      const data = await res.json();
      if (!data.text) { toast("error", data.error ?? "Rewrite failed"); return; }
      const next = range ? content.slice(0, range[0]) + data.text + content.slice(range[1]) : data.text;
      setContent(next);
      await persist(next);
      toast("success", "Rewritten.");
    } finally {
      setBusy(false);
    }
  };

  const loadVersions = async () => {
    const res = await fetch(`/api/os/proposals/${slug}/versions`);
    setVersions((await res.json()).versions ?? []);
  };
  const restore = async (id: string) => {
    const res = await fetch(`/api/os/proposals/${slug}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", id }) });
    const data = await res.json();
    if (data.content) { setContent(data.content); setVersions(null); toast("success", "Version restored."); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/os/grants" className="btn btn-ghost !py-1.5 !px-3 text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Grants</Link>
        <div className="min-w-0">
          <p className="font-semibold truncate">{meta.title}</p>
          <p className="text-[11px] text-muted">{meta.orgName ? `Proposal to ${meta.orgName}` : "Proposal"}</p>
        </div>
        <span className="text-[11px] text-muted flex items-center gap-1 ml-1">
          {save === "saving" ? <><Loader2 className="w-3 h-3 animate-spin" /> saving</> : save === "saved" ? <><Check className="w-3 h-3 text-brand" /> saved</> : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setView((v) => (v === "split" ? "preview" : "split"))}>
            {view === "split" ? <><Eye className="w-3.5 h-3.5" /> Preview</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
          </button>
          <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={loadVersions}><History className="w-3.5 h-3.5" /> History</button>
          <a className="btn btn-primary !py-1.5 !px-3 text-xs" href={`/api/os/proposals/${slug}/export/docx`}><Download className="w-3.5 h-3.5" /> Export Word</a>
        </div>
      </div>

      {/* AI toolbar */}
      <div className="card p-2.5 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted flex items-center gap-1 font-medium"><Wand2 className="w-3.5 h-3.5 text-brand" /> AI:</span>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />}
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("selection", "Shorten and tighten this passage")}>Shorten selection</button>
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("selection", "Make this more formal and funder-appropriate")}>Formalize selection</button>
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("selection", "Expand this with concrete detail")}>Expand selection</button>
        <span className="w-px h-4 bg-line mx-1" />
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" disabled={busy} onClick={() => rewrite("document", "Tighten the whole proposal and strengthen weak sections, preserving structure")}>Polish whole document</button>
      </div>

      {/* Editor / preview */}
      <div className={`grid gap-4 ${view === "split" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {view === "split" && (
          <textarea
            ref={taRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="field font-mono text-[13px] leading-relaxed min-h-[70vh] resize-none"
            spellCheck
          />
        )}
        <div className="card p-6 min-h-[70vh] overflow-auto">
          <div className="[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-ink [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:text-sm [&_p]:text-ink/85 [&_p]:my-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:space-y-1 [&_li]:text-ink/85 [&_table]:w-full [&_table]:text-xs [&_table]:my-3 [&_th]:border [&_th]:border-line [&_th]:bg-bg [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-line [&_td]:p-2 [&_strong]:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Versions modal */}
      {versions && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setVersions(null)}>
          <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-3">Version history</p>
            {versions.length === 0 ? (
              <p className="text-sm text-muted">No saved versions yet. Versions are captured on export and restore.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="text-muted text-xs">{new Date(v.savedAt).toLocaleString("en-CA")}</span>
                    <button className="btn btn-ghost !py-1 !px-2.5 text-xs" onClick={() => restore(v.id)}>Restore</button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-right"><button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setVersions(null)}>Close</button></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge tone={meta.status === "exported" ? "green" : "gray"}>{meta.status}</Badge>
        <span className="text-[11px] text-muted">Autosaves as you type. Export captures a version snapshot.</span>
      </div>
    </div>
  );
}
