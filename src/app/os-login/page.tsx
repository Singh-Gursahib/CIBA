"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MEMBERS } from "@/lib/os/seed";

export default function OSLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function signIn(memberId: string) {
    setBusy(memberId);
    await fetch("/api/os/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    router.push("/os");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <div className="text-center mb-10 fade-up">
        <span className="pill">CIBA OS · internal</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Who&apos;s working?</h1>
        <p className="mt-2 text-muted">
          Each member sees only the collaborations, funding, documents, and integrations they have access to —
          and the AI assistant respects the same boundaries.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MEMBERS.map((m, i) => (
          <button
            key={m.id}
            onClick={() => signIn(m.id)}
            disabled={!!busy}
            className="card p-5 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all fade-up disabled:opacity-60"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid place-items-center w-11 h-11 rounded-full text-white font-bold"
                style={{ background: m.avatarColor }}
              >
                {m.name.split(" ").map((w) => w[0]).join("")}
              </span>
              <div>
                <p className="font-semibold leading-tight">{m.name}</p>
                <p className="text-sm text-muted">{m.title}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              {m.projectAccess === "*"
                ? "Access: all collaborations"
                : `Access: ${m.projectAccess.length} collaboration${m.projectAccess.length === 1 ? "" : "s"}`}
            </p>
            {busy === m.id && <p className="mt-2 text-xs text-brand font-semibold">Signing in…</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
