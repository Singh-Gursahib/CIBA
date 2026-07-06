"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  Waypoints,
  Inbox,
  CalendarDays,
  Rocket,
  Landmark,
  Banknote,
  Palette,
  Megaphone,
  Cable,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavSection = { title: string; items: NavItem[] };

// Presentation only — which items a member may actually see is decided
// server-side and passed in as `allowedHrefs`. Grouping gives the 13 modules
// a scannable hierarchy instead of one flat list.
const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/os", label: "Dashboard", icon: LayoutDashboard },
      { href: "/os/brain-map", label: "Brain Map", icon: Network },
      { href: "/os/knowledge", label: "Knowledge", icon: Waypoints },
      { href: "/os/inbox", label: "Inbox", icon: Inbox },
      { href: "/os/timeline", label: "Timeline", icon: CalendarDays },
    ],
  },
  {
    title: "Programs",
    items: [
      { href: "/os/ventures", label: "Ventures", icon: Rocket },
      { href: "/os/grants", label: "Grants", icon: Landmark },
      { href: "/os/finance", label: "Finance", icon: Banknote },
    ],
  },
  {
    title: "Studios",
    items: [
      { href: "/os/marketing", label: "Marketing Studio", icon: Palette },
      { href: "/os/social", label: "Social Studio", icon: Megaphone },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/os/integrations", label: "Integrations", icon: Cable },
      { href: "/os/assistant", label: "AI Assistant", icon: Sparkles },
      { href: "/os/admin", label: "Admin", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  // Dashboard (`/os`) matches only the exact root; every other item also
  // matches its nested routes (e.g. /os/grants/new highlights Grants).
  if (href === "/os") return pathname === "/os";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ allowedHrefs }: { allowedHrefs: string[] }) {
  const pathname = usePathname();
  const allowed = new Set(allowedHrefs);

  return (
    <nav className="mt-2 space-y-4">
      {SECTIONS.map((section) => {
        const items = section.items.filter((i) => allowed.has(i.href));
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted/70">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {items.map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-brand-soft text-brand-ink font-semibold"
                        : "font-medium text-ink/75 hover:bg-brand-soft/60 hover:text-brand-ink"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand transition-opacity ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <n.icon
                      className={`w-[18px] h-[18px] transition-colors ${
                        active ? "text-brand" : "text-muted group-hover:text-brand"
                      }`}
                      strokeWidth={1.75}
                    />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
