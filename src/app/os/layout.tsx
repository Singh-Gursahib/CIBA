import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember, impersonator } from "@/lib/os/auth";
import { ImpersonationBanner } from "./impersonation-banner";
import { SwitchMemberButton } from "./switch-member";

const NAV = [
  { href: "/os", label: "Dashboard", icon: "▦" },
  { href: "/os/brain-map", label: "Brain Map", icon: "◉" },
  { href: "/os/inbox", label: "Inbox", icon: "✉" },
  { href: "/os/timeline", label: "Timeline", icon: "▤" },
  { href: "/os/ventures", label: "Ventures", icon: "🚀" },
  { href: "/os/finance", label: "Finance", icon: "¤" },
  { href: "/os/social", label: "Social Studio", icon: "📣" },
  { href: "/os/integrations", label: "Integrations", icon: "⇄" },
  { href: "/os/assistant", label: "AI Assistant", icon: "✦" },
  { href: "/os/admin", label: "Admin", icon: "⚙" },
];

export default async function OSLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  if (!member) redirect("/os-login");
  const admin = await impersonator();

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 flex gap-6">
      <aside className="w-56 shrink-0 hidden md:block">
        <div className="card p-4 sticky top-24">
          <div className="flex items-center gap-2.5 pb-3 border-b border-line">
            <span
              className="grid place-items-center w-9 h-9 rounded-full text-white font-bold text-sm"
              style={{ background: member.avatarColor }}
            >
              {member.name.split(" ").map((w) => w[0]).join("")}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{member.name}</p>
              <p className="text-xs text-muted truncate">{member.title}</p>
            </div>
          </div>
          <nav className="mt-3 space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-soft text-ink/80 hover:text-brand-ink transition"
              >
                <span className="text-brand">{n.icon}</span> {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 pt-3 border-t border-line">
            <SwitchMemberButton />
          </div>
          <p className="mt-3 text-[11px] text-muted leading-snug">
            You see only the collaborations you have access to
            {member.projectAccess === "*" ? " (all — executive)" : ` (${member.projectAccess.length})`}.
          </p>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        {admin && admin.id !== member.id && (
          <ImpersonationBanner adminName={admin.name} viewingName={member.name} />
        )}
        {children}
      </div>
    </div>
  );
}
