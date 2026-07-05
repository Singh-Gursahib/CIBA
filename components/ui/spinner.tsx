import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-ink-faint", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-[linear-gradient(110deg,var(--color-surface-tint)_40%,#fff_50%,var(--color-surface-tint)_60%)]",
        "bg-[length:200%_100%] animate-shimmer",
        className
      )}
      aria-hidden
    />
  );
}
