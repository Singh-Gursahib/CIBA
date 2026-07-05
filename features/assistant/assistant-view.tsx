"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, Search, FileText, Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "@/features/knowledge/markdown";
import { readNdjson } from "@/lib/use-ndjson";
import type { DocMeta } from "@/types/knowledge";

interface ToolStep {
  id: string;
  name: string;
  args: Record<string, unknown>;
  done: boolean;
  summary?: string;
}
interface Message {
  role: "user" | "assistant";
  content: string;
  steps: ToolStep[];
}

const STARTERS = [
  "What are CIBA's three strategic pillars?",
  "Summarize the Core Workshop Series",
  "Which funders support CIBA's programs?",
  "How does the SME AI Pilot Program work?",
];

export function AssistantView({ docs }: { docs: DocMeta[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const titleToSlug = new Map(docs.map((d) => [d.title.toLowerCase(), d.slug]));

  const scrollToBottom = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const history: Message[] = [
      ...messages,
      { role: "user", content: text, steps: [] },
      { role: "assistant", content: "", steps: [] },
    ];
    setMessages(history);
    setInput("");
    setBusy(true);
    scrollToBottom();

    const idx = history.length - 1;
    const patch = (fn: (m: Message) => Message) =>
      setMessages((prev) => prev.map((m, i) => (i === idx ? fn(m) : m)));

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      await readNdjson(res, (ev) => {
        if (ev.type === "tool_start") {
          patch((m) => ({
            ...m,
            steps: [
              ...m.steps,
              { id: String(ev.id), name: String(ev.name), args: (ev.args as Record<string, unknown>) ?? {}, done: false },
            ],
          }));
        } else if (ev.type === "tool_end") {
          patch((m) => ({
            ...m,
            steps: m.steps.map((s) =>
              s.id === ev.id ? { ...s, done: true, summary: String(ev.summary ?? "") } : s
            ),
          }));
        } else if (ev.type === "text") {
          patch((m) => ({ ...m, content: m.content + String(ev.delta ?? "") }));
          scrollToBottom();
        } else if (ev.type === "error") {
          patch((m) => ({ ...m, content: m.content + `\n\n_${String(ev.message)}_` }));
        }
      });
    } catch {
      patch((m) => ({ ...m, content: "Something went wrong reaching the assistant. Please try again." }));
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[520px] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-1 pb-6">
          {empty ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-river-tint text-river">
                <Sparkles className="size-6" strokeWidth={1.75} />
              </div>
              <h2 className="mt-4 font-display text-2xl">Ask the knowledge base</h2>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">
                I search and read only the documents I need before answering. Try one of these:
              </p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-md border border-line bg-surface px-4 py-3 text-left text-[13px] text-ink-soft transition-colors hover:border-river/40 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-6 py-4">
              {messages.map((m, i) => (
                <li key={i}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-river px-4 py-2.5 text-sm text-white">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-river-tint text-river">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {m.steps.length > 0 && <ToolTrace steps={m.steps} />}
                        {m.content ? (
                          <AssistantAnswer content={m.content} titleToSlug={titleToSlug} />
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-ink-faint">
                            <Loader2 className="size-3.5 animate-spin" /> Thinking…
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-paper/80 pt-3 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <div className="flex flex-1 items-end rounded-xl border border-line-strong bg-surface px-4 py-2.5 shadow-1 focus-within:border-river focus-within:ring-2 focus-within:ring-river/15">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask about CIBA's projects, grants, or initiatives…"
              className="max-h-32 w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
          <Button type="submit" disabled={!input.trim() || busy} loading={busy} className="size-10 rounded-xl p-0">
            {!busy && <ArrowUp className="size-4" />}
          </Button>
        </form>
        {!empty && (
          <div className="mx-auto mt-2 flex max-w-3xl justify-end">
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> New chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolTrace({ steps }: { steps: ToolStep[] }) {
  return (
    <div className="mb-2 space-y-1">
      {steps.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-xs text-ink-soft">
          {s.done ? (
            <Check className="size-3.5 text-river" />
          ) : (
            <Loader2 className="size-3.5 animate-spin text-ink-faint" />
          )}
          {s.name === "search_documents" ? (
            <span className="flex items-center gap-1">
              <Search className="size-3" /> Searching
              {s.args.query ? <em className="not-italic text-ink">“{String(s.args.query)}”</em> : null}
            </span>
          ) : s.name === "read_document" ? (
            <span className="flex items-center gap-1">
              <FileText className="size-3" /> {s.summary || "Reading document"}
            </span>
          ) : (
            <span>{s.summary || s.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Linkifies cited **Document Titles** to their doc pages. */
function AssistantAnswer({
  content,
  titleToSlug,
}: {
  content: string;
  titleToSlug: Map<string, string>;
}) {
  return (
    <div className="text-[15px] leading-relaxed">
      <MarkdownView
        content={content}
        onWikiLink={() => {}}
        className="max-w-none [&_p]:my-2"
      />
      <CitedLinks content={content} titleToSlug={titleToSlug} />
    </div>
  );
}

function CitedLinks({
  content,
  titleToSlug,
}: {
  content: string;
  titleToSlug: Map<string, string>;
}) {
  const cited = new Map<string, string>();
  for (const m of content.matchAll(/\*\*([^*]+)\*\*/g)) {
    const slug = titleToSlug.get(m[1].trim().toLowerCase());
    if (slug) cited.set(slug, m[1].trim());
  }
  if (cited.size === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
      <span className="text-[11px] font-medium text-ink-faint">Sources:</span>
      {[...cited.entries()].map(([slug, title]) => (
        <Link
          key={slug}
          href={`/knowledge/docs/${slug}`}
          className="rounded-full bg-river-tint px-2 py-0.5 text-[11.5px] font-medium text-river-deep hover:bg-river/15"
        >
          {title}
        </Link>
      ))}
    </div>
  );
}
