import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "river" | "amber" | "clay" | "sage";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-tint text-ink-soft border-line",
  river: "bg-river-tint text-river-deep border-river/20",
  amber: "bg-amber-tint text-amber border-amber/25",
  clay: "bg-clay-tint text-clay border-clay/25",
  sage: "bg-sage-tint text-sage border-sage/25",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11.5px] font-medium leading-normal whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
