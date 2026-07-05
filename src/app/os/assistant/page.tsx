"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "What report deadlines are coming up?",
  "How much funding do we have committed right now?",
  "Which ventures are in my programs and how are they doing?",
  "What's our cash position after the 3-month forecast?",
  "What social posts are scheduled next?",
];

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/os/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.answer ?? data.error ?? "Something went wrong." }]);
      setMode(data.mode ?? "");
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Request failed — try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted mt-1">
          Answers only from data <em>you</em> can access — the model literally never sees the rest.
          Switch members and ask the same question to watch the answers change.
          {mode && (
            <span className="ml-2 text-[11px] uppercase tracking-wide">
              [{mode.startsWith("ai") ? "Claude" : "demo mode"}]
            </span>
          )}
        </p>
      </div>

      <div className="card p-5 min-h-[420px] flex flex-col">
        <div className="flex-1 space-y-4">
          {msgs.length === 0 && (
            <div className="text-center py-10">
              <p className="text-2xl">✦</p>
              <p className="text-sm text-muted mt-2 mb-5">Ask about your collaborations, funding, deadlines, or ventures.</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-line hover:bg-brand-soft hover:text-brand-ink transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} fade-up`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-brand text-white rounded-br-sm" : "bg-bg border border-line rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-bg border border-line rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-muted">
                Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            className="field flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about anything in your scope…"
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
