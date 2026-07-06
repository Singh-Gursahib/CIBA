import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Network, Inbox, CalendarDays, Rocket, Banknote, Landmark, Palette, Megaphone, Cable, Sparkles, Settings } from "lucide-react";
import { currentMember, impersonator } from "@/lib/os/auth";
import { ToastProvider } from "@/components/toast";
import { ImpersonationBanner } from "./impersonation-banner";
import { SwitchMemberButton } from "./switch-member";

const NAV = [
  { href: "/os", label: "Dashboard", icon: LayoutDashboard },
  { href: "/os/brain-map", label: "Brain Map", icon: Network },
  { href: "/os/inbox", label: "Inbox", icon: Inbox },
  { href: "/os/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/os/ventures", label: "Ventures", icon: Rocket },
  { href: "/os/grants", label: "Grants", icon: Landmark },
  { href: "/os/finance", label: "Finance", icon: Banknote },
  { href: "/os/marketing", label: "Marketing Studio", icon: Palette },
  { href: "/os/social", label: "Social Studio", icon: Megaphone },
  { href: "/os/integrations", label: "Integrations", icon: Cable },
  { href: "/os/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/os/admin", label: "Admin", icon: Settings },
];

export default async function OSLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  if (!member) redirect("/os-login");
  const admin = await impersonator();

  return (
    <ToastProvider>
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
          <nav className="mt-3 space-y-0.5">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-soft text-ink/80 hover:text-brand-ink transition"
              >
                <n.icon className="w-[18px] h-[18px] text-muted" strokeWidth={1.75} /> {n.label}
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
    </ToastProvider>
  );
}
