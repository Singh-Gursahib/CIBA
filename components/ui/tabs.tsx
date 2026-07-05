"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; icon?: ReactNode }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1 bg-surface-tint border border-line rounded-md p-1", className)}
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[8px] px-3.5 h-8 text-[13px] font-medium",
            "transition-all duration-150 cursor-pointer",
            value === item.value
              ? "bg-surface text-ink shadow-1 border border-line"
              : "text-ink-soft hover:text-ink border border-transparent"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
