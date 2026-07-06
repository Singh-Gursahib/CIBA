import { redirect } from "next/navigation";
import { currentMember, impersonator } from "@/lib/os/auth";
import { ToastProvider } from "@/components/toast";
import { ImpersonationBanner } from "./impersonation-banner";
import { SwitchMemberButton } from "./switch-member";
import { SidebarNav } from "./sidebar-nav";
import type { Member } from "@/lib/os/types";
import { canUseGrants } from "@/lib/os/grants/access";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { canOperateSocial } from "@/lib/os/social/access";
import { canUseFinance } from "@/lib/os/finance";

// Authorization source of truth for the sidebar: which modules a member may
// enter. Presentation (icons, grouping, active state) lives in <SidebarNav>.
// `show` omitted = visible to everyone. Keeping this server-side means the
// permission rules never ship to the browser.
const NAV_ACCESS: { href: string; show?: (m: Member) => boolean }[] = [
  { href: "/os" },
  { href: "/os/brain-map" },
  { href: "/os/knowledge" },
  { href: "/os/inbox" },
  { href: "/os/timeline" },
  { href: "/os/ventures" },
  { href: "/os/grants", show: canUseGrants },
  { href: "/os/finance", show: canUseFinance },
  { href: "/os/marketing", show: canUseMarketing },
  { href: "/os/social", show: canOperateSocial },
  { href: "/os/integrations" },
  { href: "/os/assistant" },
  { href: "/os/admin", show: (m) => m.role === "executive" },
];

export default async function OSLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  if (!member) redirect("/os-login");
  const admin = await impersonator();
  const allowedHrefs = NAV_ACCESS.filter((n) => !n.show || n.show(member)).map((n) => n.href);

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
          <SidebarNav allowedHrefs={allowedHrefs} />
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
