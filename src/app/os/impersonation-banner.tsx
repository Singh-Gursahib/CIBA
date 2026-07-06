"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

export function ImpersonationBanner({ adminName, viewingName }: { adminName: string; viewingName: string }) {
  const router = useRouter();
  return (
    <div className="mb-4 rounded-xl bg-accent-soft border border-accent/30 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <p>
        <span className="font-semibold text-accent inline-flex items-center gap-1 align-middle"><Eye className="w-3.5 h-3.5" /> Admin view:</span>{" "}
        {adminName} viewing as <span className="font-semibold">{viewingName}</span> — you see exactly what they see.
      </p>
      <button
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:opacity-90 transition"
        onClick={async () => {
          await fetch("/api/os/impersonate", { method: "DELETE" });
          router.push("/os/admin");
          router.refresh();
        }}
      >
        Return to my account
      </button>
    </div>
  );
}

export function ViewAsButton({ memberId, disabled }: { memberId: string; disabled?: boolean }) {
  const router = useRouter();
  return (
    <button
      disabled={disabled}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line hover:bg-brand-soft hover:text-brand-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={async () => {
        await fetch("/api/os/impersonate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        });
        router.push("/os");
        router.refresh();
      }}
    >
      <Eye className="w-3.5 h-3.5" /> View as
    </button>
  );
}
