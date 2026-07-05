"use client";

import { useRouter } from "next/navigation";

export function SwitchMemberButton() {
  const router = useRouter();
  return (
    <button
      className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-line hover:bg-brand-soft text-ink/70 hover:text-brand-ink transition"
      onClick={async () => {
        await fetch("/api/os/login", { method: "DELETE" });
        router.push("/os-login");
        router.refresh();
      }}
    >
      ⇆ Switch member
    </button>
  );
}
