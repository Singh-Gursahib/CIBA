"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  FileType,
  ChevronDown,
  Check,
  Cloud,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ProposalEditor } from "./editor";
import { VersionHistory } from "./version-history";
import { useAutosave } from "./use-autosave";
import type { ProposalMeta } from "@/types/grants";

export function ProposalWorkspace({
  meta,
  initialMarkdown,
}: {
  meta: ProposalMeta;
  initialMarkdown: string;
}) {
  const toast = useToast();
  const { state, schedule, saveNow } = useAutosave(meta.slug, initialMarkdown);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [docAiOpen, setDocAiOpen] = useState(false);
  const [docAiBusy, setDocAiBusy] = useState(false);
  const [docAiInstruction, setDocAiInstruction] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  // Content the (keyed) editor mounts with. Only changes on restore / document AI,
  // so it is safe to read during render; live edits go through the autosave hook.
  const [mountContent, setMountContent] = useState(initialMarkdown);
  const getMarkdownRef = useRef<() => string>(() => initialMarkdown);

  const onMarkdownChange = useCallback(
    (md: string) => {
      schedule(md);
    },
    [schedule]
  );

  const registerGetMarkdown = useCallback((fn: () => string) => {
    getMarkdownRef.current = fn;
  }, []);

  const exportFile = async (fmt: "pdf" | "docx") => {
    setExportOpen(false);
    setExporting(fmt);
    try {
      await saveNow();
      const res = await fetch(`/api/proposals/${meta.slug}/export/${fmt}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CIBA-${meta.slug}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", `Exported ${fmt.toUpperCase()}`);
    } catch {
      toast("error", `Could not export ${fmt.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const runDocAi = async () => {
    if (!docAiInstruction.trim()) return;
    setDocAiBusy(true);
    try {
      await saveNow();
      const res = await fetch(`/api/proposals/${meta.slug}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "document",
          text: getMarkdownRef.current(),
          instruction: docAiInstruction,
        }),
      });
      const data = await res.json();
      if (data.text) {
        // Snapshot current, then persist and reload the editor with new content.
        await fetch(`/api/proposals/${meta.slug}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "snapshot" }),
        });
        await fetch(`/api/proposals/${meta.slug}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: data.text }),
        });
        setMountContent(data.text);
        setEditorKey((k) => k + 1);
        setDocAiOpen(false);
        setDocAiInstruction("");
        toast("success", "Rewrote the full proposal");
      } else toast("error", "Rewrite failed");
    } catch {
      toast("error", "Rewrite failed");
    } finally {
      setDocAiBusy(false);
    }
  };

  const restoreVersion = (content: string) => {
    setMountContent(content);
    setEditorKey((k) => k + 1);
    toast("success", "Version restored");
  };

  return (
    <div>
      {/* Title bar */}
      <div className="sticky top-0 z-20 -mx-8 mb-6 border-b border-line bg-paper/85 px-8 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/grants" aria-label="Back to grants" className="text-ink-faint hover:text-ink">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-ink">{meta.title}</h1>
              <SaveIndicator state={state} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge tone={meta.status === "exported" ? "sage" : "amber"}>
              {meta.status === "exported" ? "Exported" : "Draft"}
            </Badge>
            <VersionHistory slug={meta.slug} onRestore={restoreVersion} />
            <Button variant="ghost" size="sm" onClick={() => setDocAiOpen((v) => !v)} icon={<Sparkles className="size-3.5" />}>
              AI
            </Button>
            <div className="relative">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setExportOpen((v) => !v)}
                loading={!!exporting}
                icon={!exporting ? <Download className="size-3.5" /> : undefined}
              >
                Export
                <ChevronDown className="size-3.5" />
              </Button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface p-1.5 shadow-3 animate-scale-in">
                  <button
                    onClick={() => exportFile("pdf")}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-soft hover:bg-surface-tint hover:text-ink"
                  >
                    <FileText className="size-4 text-clay" /> Export as PDF
                  </button>
                  <button
                    onClick={() => exportFile("docx")}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-soft hover:bg-surface-tint hover:text-ink"
                  >
                    <FileType className="size-4 text-river" /> Export as Word
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {docAiOpen && (
        <div className="mx-auto mb-5 max-w-3xl rounded-lg border border-river/20 bg-river-tint/40 p-3.5 animate-scale-in">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-river-deep">
            <Sparkles className="size-3.5" /> Rewrite the entire proposal
          </p>
          <div className="flex gap-2">
            <input
              value={docAiInstruction}
              onChange={(e) => setDocAiInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runDocAi()}
              placeholder="e.g. Make it more specific about rural impact and tighten every section"
              className="h-9 flex-1 rounded-md border border-line bg-surface px-3 text-sm focus:border-river focus:outline-none"
            />
            <Button size="sm" onClick={runDocAi} loading={docAiBusy} icon={!docAiBusy ? <Sparkles className="size-3.5" /> : undefined}>
              {docAiBusy ? "Rewriting…" : "Rewrite"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Your current draft is snapshotted first, so you can restore it from History.</p>
        </div>
      )}

      {/* Editor */}
      <div className="mx-auto max-w-3xl pb-24">
        <ProposalEditor
          key={editorKey}
          slug={meta.slug}
          initialMarkdown={mountContent}
          onMarkdownChange={onMarkdownChange}
          registerGetMarkdown={registerGetMarkdown}
        />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-ink-faint">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      ) : state === "editing" ? (
        <>
          <Cloud className="size-3" /> Editing…
        </>
      ) : (
        <>
          <Check className="size-3 text-river" /> Saved
        </>
      )}
    </span>
  );
}
