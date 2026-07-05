"use client";

import { Check, Square, GalleryVertical, Briefcase, Smartphone } from "lucide-react";
import { ALL_FORMATS, FORMAT_META, type OutputFormat } from "@/types/marketing";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<OutputFormat, React.ReactNode> = {
  instagram_post: <Square className="size-3.5" />,
  instagram_story: <GalleryVertical className="size-3.5" />,
  linkedin_post: <Briefcase className="size-3.5" />,
  mobile_post: <Smartphone className="size-3.5" />,
};

/** Miniature aspect-ratio wireframes so each format is recognizable at a glance. */
const RATIO_BOX: Record<OutputFormat, string> = {
  instagram_post: "h-9 w-9",
  instagram_story: "h-11 w-[30px]",
  linkedin_post: "h-7 w-11",
  mobile_post: "h-11 w-[30px]",
};

export function FormatPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: OutputFormat[];
  onChange: (formats: OutputFormat[]) => void;
  disabled?: boolean;
}) {
  const toggle = (f: OutputFormat) =>
    onChange(selected.includes(f) ? selected.filter((x) => x !== f) : [...selected, f]);

  const allSelected = selected.length === ALL_FORMATS.length;

  return (
    <div className={cn(disabled && "pointer-events-none opacity-50")}>
      <div className="grid grid-cols-2 gap-2.5">
        {ALL_FORMATS.map((f) => {
          const meta = FORMAT_META[f];
          const active = selected.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(f)}
              className={cn(
                "relative flex items-center gap-3 rounded-md border p-3 text-left",
                "transition-all duration-150 cursor-pointer",
                active
                  ? "border-river bg-river-tint/60 ring-1 ring-river/30"
                  : "border-line bg-surface hover:border-ink-faint"
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                <div
                  className={cn(
                    "rounded-[4px] border-2",
                    RATIO_BOX[f],
                    active ? "border-river bg-river/10" : "border-line-strong bg-surface-tint"
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                  {ICONS[f]}
                  {meta.label}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {meta.ratio} · {meta.size}px
                </div>
              </div>
              {active && (
                <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-river text-white">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(allSelected ? [] : [...ALL_FORMATS])}
        className="mt-2 text-[13px] font-medium text-river hover:underline"
      >
        {allSelected ? "Clear selection" : "Select all formats"}
      </button>
    </div>
  );
}
