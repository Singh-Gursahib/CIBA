import { cn } from "@/lib/utils/cn";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded-[5px] border border-line-strong bg-surface-tint",
        "px-1.5 py-0.5 font-mono text-[11px] text-ink-soft shadow-[inset_0_-1px_0_var(--color-line-strong)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
