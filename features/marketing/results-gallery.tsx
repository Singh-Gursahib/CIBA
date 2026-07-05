"use client";

import { useState } from "react";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { FORMAT_META, fileUrl, type MarketingJob, type OutputFormat } from "@/types/marketing";
import { slugify } from "@/lib/utils/slugify";
import { cn } from "@/lib/utils/cn";

export function ResultsGallery({
  job,
  onRegenerate,
}: {
  job: MarketingJob;
  onRegenerate?: (format: OutputFormat) => void;
}) {
  const [lightbox, setLightbox] = useState<OutputFormat | null>(null);
  const open = lightbox ? job.outputs.find((o) => o.format === lightbox) : null;
  const eventSlug = slugify(job.eventName || job.brief.slice(0, 40));

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {job.outputs.map((output) => {
          const meta = FORMAT_META[output.format];
          return (
            <figure key={output.format} className="group">
              <div
                className={cn(
                  "relative overflow-hidden rounded-lg border border-line bg-surface-tint",
                  meta.ratioClass
                )}
              >
                {output.status === "done" && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(output.path)}
                      alt={`${meta.label} poster`}
                      className="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
                      onClick={() => setLightbox(output.format)}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-ink/50 to-transparent p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <a
                        href={fileUrl(output.path)}
                        download={`ciba-${eventSlug}-${output.format}.${output.path.endsWith(".svg") ? "svg" : "png"}`}
                        className="pointer-events-auto flex size-7 items-center justify-center rounded-md bg-white/95 text-ink shadow-1 hover:bg-white"
                        aria-label={`Download ${meta.label}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="size-3.5" />
                      </a>
                      {onRegenerate && (
                        <button
                          onClick={() => onRegenerate(output.format)}
                          className="pointer-events-auto flex size-7 items-center justify-center rounded-md bg-white/95 text-ink shadow-1 hover:bg-white"
                          aria-label={`Regenerate ${meta.label}`}
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
                {(output.status === "pending" || output.status === "generating") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    {output.status === "generating" ? (
                      <>
                        <Spinner className="size-5 text-river" />
                        <span className="text-xs text-ink-soft">Generating…</span>
                      </>
                    ) : (
                      <span className="text-xs text-ink-faint">Queued</span>
                    )}
                  </div>
                )}
                {output.status === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <AlertCircle className="size-5 text-clay" />
                    <span className="text-xs text-clay">{output.error || "Failed"}</span>
                    {onRegenerate && (
                      <button
                        onClick={() => onRegenerate(output.format)}
                        className="text-xs font-medium text-river hover:underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
              </div>
              <figcaption className="mt-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">{meta.label}</span>
                <Badge tone="neutral" className="font-mono text-[10px]">{meta.ratio}</Badge>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <Dialog
        open={!!open}
        onClose={() => setLightbox(null)}
        title={open ? FORMAT_META[open.format].label : undefined}
        className="w-[min(92vw,860px)]"
      >
        {open && open.status === "done" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl(open.path)}
            alt={`${FORMAT_META[open.format].label} full preview`}
            className="max-h-[75vh] w-full rounded-md object-contain"
          />
        )}
      </Dialog>
    </>
  );
}
