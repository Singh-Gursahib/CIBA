"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // click on backdrop closes
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto bg-surface rounded-xl border border-line shadow-3 p-0",
        "w-[min(92vw,560px)] animate-scale-in",
        "backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]",
        className
      )}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-md p-1.5 text-ink-faint hover:text-ink hover:bg-surface-tint transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </dialog>
  );
}
