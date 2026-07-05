"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Eye } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MarkdownView } from "@/features/knowledge/markdown";
import { friendlyDateTime } from "@/lib/utils/dates";
import type { ProposalVersion } from "@/features/grants/data";

export function VersionHistory({
  slug,
  onRestore,
}: {
  slug: string;
  onRestore: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ id: string; content: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/proposals/${slug}/versions`)
      .then((r) => r.json())
      .then((d) => setVersions(d.versions ?? []))
      .finally(() => setLoading(false));
  }, [open, slug]);

  const view = async (id: string) => {
    const res = await fetch(`/api/proposals/${slug}/versions?id=${encodeURIComponent(id)}`);
    const d = await res.json();
    if (d.content != null) setPreview({ id, content: d.content });
  };

  const restore = async (id: string) => {
    const res = await fetch(`/api/proposals/${slug}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", id }),
    });
    const d = await res.json();
    if (d.content != null) {
      onRestore(d.content);
      setPreview(null);
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} icon={<History className="size-3.5" />}>
        History
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Version history" className="w-[min(94vw,640px)]">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : preview ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] text-ink-soft">{friendlyDateTime(preview.id)}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>
                  Back
                </Button>
                <Button size="sm" onClick={() => restore(preview.id)} icon={<RotateCcw className="size-3.5" />}>
                  Restore this version
                </Button>
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-md border border-line bg-surface-tint/40 p-4">
              <MarkdownView content={preview.content} className="max-w-none text-[13px]" />
            </div>
          </div>
        ) : versions.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            No saved versions yet. Snapshots are kept when you edit, run document AI, or export.
          </p>
        ) : (
          <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2.5">
                <span className="font-mono text-[13px] text-ink">{friendlyDateTime(v.savedAt)}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => view(v.id)} icon={<Eye className="size-3.5" />}>
                    Preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => restore(v.id)} icon={<RotateCcw className="size-3.5" />}>
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
