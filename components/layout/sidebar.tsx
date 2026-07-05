"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Palette, Share2, Landmark, Waypoints, Sparkles } from "lucide-react";
import { Logo, CoBrand } from "@/components/ui/logo";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/marketing", label: "Marketing Studio", icon: Palette },
  { href: "/social", label: "Social Media", icon: Share2 },
  { href: "/grants", label: "Grants", icon: Landmark },
  { href: "/knowledge", label: "Knowledge", icon: Waypoints },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-surface">
      <div className="px-5 pt-5 pb-4">
        <Link href="/" aria-label="CIBA home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 px-3" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium",
                    "transition-colors duration-150",
                    active
                      ? "bg-river-tint text-river-deep"
                      : "text-ink-soft hover:bg-surface-tint hover:text-ink"
                  )}
                >
                  <Icon className={cn("size-[17px]", active ? "text-river" : "text-ink-faint")} strokeWidth={1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <CoBrand />
        <p className="mt-1 text-[11px] text-ink-faint">AI workflow platform</p>
      </div>
    </aside>
  );
}
