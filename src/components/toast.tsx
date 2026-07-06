"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<(kind: ToastKind, message: string) => void>(() => {});
export function useToast() {
  return useContext(ToastCtx);
}

let nextId = 1;
const ICON: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-brand" />,
  error: <AlertCircle className="w-4 h-4 text-red-600" />,
  info: <Info className="w-4 h-4 text-muted" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lg max-w-sm fade-up">
            {ICON[t.kind]}
            <span className="text-ink">{t.message}</span>
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="ml-1 text-muted hover:text-ink" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
