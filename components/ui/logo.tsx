import { cn } from "@/lib/utils/cn";

/**
 * CIBA wordmark. Placeholder until the real logo files land in brand/ —
 * once brand/ciba-logo.png exists this can render the image instead.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className="flex size-8 items-center justify-center rounded-[9px] bg-river text-white shadow-1">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" aria-hidden>
          {/* Confluence mark: two rivers joining, nod to Kamloops */}
          <path
            d="M4 5c4 0 5 5 8 7s8 2 8 2M4 19c4 0 5-5 8-7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-ink">CIBA</div>
        <div className="mt-0.5 text-[10px] font-medium tracking-wide text-ink-faint">
          BUSINESS ACCELERATOR
        </div>
      </div>
    </div>
  );
}

/** CIBA × TRU affiliation lockup for the sidebar footer. */
export function CoBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[11px] text-ink-faint", className)}>
      <span className="font-semibold text-ink-soft">CIBA</span>
      <span aria-hidden>×</span>
      <span className="font-semibold text-ink-soft">TRU</span>
      <span className="ml-1">Kamloops, BC</span>
    </div>
  );
}
