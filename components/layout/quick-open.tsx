"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Search, CornerDownLeft } from "lucide-react";
import { DOC_TYPE_META, type DocMeta } from "@/types/knowledge";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils/cn";

/** Global Cmd+K document quick-open, mounted once in the shell. */
export function QuickOpen() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open && docs.length === 0) {
      fetch("/api/knowledge/docs")
        .then((r) => r.json())
        .then((d) => setDocs(d.docs ?? []))
        .catch(() => {});
    }
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, docs.length]);

  const fuse = useMemo(
    () => new Fuse(docs, { keys: ["title", "tags", "summary"], threshold: 0.4 }),
    [docs]
  );
  const results = useMemo(() => {
    if (!q.trim()) return docs.slice(0, 8);
    return fuse.search(q).slice(0, 8).map((r) => r.item);
  }, [q, fuse, docs]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const choose = (doc: DocMeta) => {
    setOpen(false);
    router.push(`/knowledge/docs/${doc.slug}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 backdrop-blur-[2px] pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[min(92vw,560px)] overflow-hidden rounded-xl border border-line bg-surface shadow-3 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="size-4 text-ink-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && results[active]) {
                choose(results[active]);
              }
            }}
            placeholder="Search documents…"
            className="h-12 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-faint">No documents match.</li>
          ) : (
            results.map((doc, i) => {
              const meta = DOC_TYPE_META[doc.type];
              return (
                <li key={doc.slug}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(doc)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
                      i === active ? "bg-river-tint" : "hover:bg-surface-tint"
                    )}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{doc.title}</span>
                      <span className="block truncate text-xs text-ink-faint">{meta.label}</span>
                    </span>
                    {i === active && <CornerDownLeft className="size-3.5 text-ink-faint" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
