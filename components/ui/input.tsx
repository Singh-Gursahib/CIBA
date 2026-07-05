"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const fieldBase =
  "w-full bg-surface border border-line-strong rounded-md px-3 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors duration-150 " +
  "hover:border-ink-faint focus:border-river focus:outline-none focus:ring-2 focus:ring-river/15 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-9.5", className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "py-2.5 min-h-24 resize-y", className)} {...props} />;
  }
);

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-[13px] font-medium text-ink mb-1.5", className)} {...props} />;
}

export function FieldHint({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("mt-1.5 text-xs text-ink-faint", className)}>{children}</p>;
}
