import Link from "next/link";
import {
  Palette,
  Share2,
  Landmark,
  Waypoints,
  Sparkles,
  ArrowRight,
  ImageIcon,
  FileText,
  Search,
  Activity,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { greetingForNow, fullToday, relativeTime } from "@/lib/utils/dates";
import { listJobs } from "@/features/marketing/data";
import { countDocs } from "@/lib/content/data";
import { buildGraph } from "@/lib/content/graph";
import { GraphMini } from "@/features/knowledge/graph-mini";
import { listDiscoveries, listProposals } from "@/features/grants/data";

export const dynamic = "force-dynamic";

const STATS = [
  { label: "New grant opportunities", icon: Landmark, key: "grants" },
  { label: "Proposals in progress", icon: FileText, key: "proposals" },
  { label: "Assets generated", icon: ImageIcon, key: "assets" },
  { label: "Knowledge documents", icon: Waypoints, key: "docs" },
] as const;

const QUICK_ACTIONS = [
  {
    href: "/marketing",
    icon: Palette,
    title: "New marketing asset",
    description: "Generate branded event posters from a short brief",
  },
  {
    href: "/social",
    icon: Share2,
    title: "Create a social post",
    description: "Draft and publish a video to YouTube and Instagram",
  },
  {
    href: "/grants",
    icon: Search,
    title: "Scan for grants",
    description: "Check BC and Canada funders for new opportunities",
  },
  {
    href: "/assistant",
    icon: Sparkles,
    title: "Ask the knowledge base",
    description: "Query CIBA's projects, grants, and initiatives",
  },
];

export default async function DashboardPage() {
  const [jobs, docCount, graph, discoveries, proposals] = await Promise.all([
    listJobs(),
    countDocs(),
    buildGraph(),
    listDiscoveries(),
    listProposals(),
  ]);
  const assetsGenerated = jobs
    .filter((j) => j.kind === "image")
    .reduce((n, j) => n + j.outputs.filter((o) => o.status === "done").length, 0);

  const statValues: Record<(typeof STATS)[number]["key"], number> = {
    grants: discoveries.filter((d) => d.status === "new").length,
    proposals: proposals.filter((p) => p.status !== "exported").length,
    assets: assetsGenerated,
    docs: docCount,
  };

  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="enter space-y-10">
      <header>
        <p className="font-mono text-xs tracking-wide text-ink-faint uppercase">{fullToday()}</p>
        <h1 className="mt-2 font-display text-[40px] leading-tight tracking-tight">
          {greetingForNow()}, Sachin
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Here is what is happening across CIBA&apos;s marketing, grants, and knowledge base.
        </p>
      </header>

      <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, icon: Icon, key }) => (
          <Card key={key}>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-soft">{label}</span>
                <Icon className="size-4 text-ink-faint" strokeWidth={1.75} />
              </div>
              <div className="mt-2 font-display text-[32px] leading-none">{statValues[key]}</div>
            </CardBody>
          </Card>
        ))}
      </section>

      <section aria-label="Quick actions">
        <h2 className="mb-3 text-sm font-semibold text-ink">Quick actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_ACTIONS.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:border-river/40 group-hover:shadow-2">
                <CardBody className="flex h-full flex-col p-5">
                  <div className="flex size-9 items-center justify-center rounded-md bg-river-tint text-river">
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
                  <p className="mt-1 flex-1 text-[13px] text-ink-soft">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-river">
                    Open
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Recent activity" className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Recent activity</h2>
          {recentJobs.length === 0 ? (
            <EmptyState
              icon={<Activity />}
              title="No activity yet"
              description="Generated assets, grant scans, and proposals will show up here as you work."
            />
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {recentJobs.map((job) => (
                  <li key={job.id} className="flex items-center gap-3 px-5 py-3.5">
                    {job.kind === "image" ? (
                      <ImageIcon className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                    ) : (
                      <Activity className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {job.eventName || job.brief.slice(0, 80) || "Marketing job"}
                      </p>
                      <p className="text-xs text-ink-faint">{relativeTime(job.createdAt)}</p>
                    </div>
                    <Badge
                      tone={
                        job.status === "ready" ? "river" : job.status === "failed" ? "clay" : "amber"
                      }
                    >
                      {job.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Knowledge graph</h2>
          <Link href="/knowledge" className="group block">
            <Card className="overflow-hidden transition-all duration-200 group-hover:border-river/40 group-hover:shadow-2">
              <div className="relative h-56 bg-[radial-gradient(circle_at_center,#ffffff,#f4f2ee)]">
                {graph.nodes.length > 0 ? (
                  <GraphMini data={graph} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Badge tone="neutral">No documents yet</Badge>
                  </div>
                )}
              </div>
              <CardBody className="p-4">
                <p className="text-[13px] text-ink-soft">
                  {graph.nodes.length} documents across projects, grants, partnerships, and notes. Open the graph.
                </p>
              </CardBody>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
