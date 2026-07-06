import Link from "next/link";
import { Donut, HBarChart } from "@/components/charts";
import { AddEntity } from "@/components/add-entity";
import { currentMember } from "@/lib/os/auth";
import { Landmark, Megaphone, Clock } from "lucide-react";
import { readStudioPosts } from "@/lib/os/social/read-sync";
import { canUseGrants } from "@/lib/os/grants/access";
import { listDiscoveries, listProposals } from "@/lib/os/grants/store";
import {
  deadlineRadar,
  fmtCAD,
  fundingRollup,
  getMember,
  getPartner,
  impactRollup,
  visibleActivity,
  visibleFunding,
  visibleProjects,
  visibleSocial,
  visibleVentures,
} from "@/lib/os/store";

const statusPill: Record<string, string> = {
  active: "bg-brand-soft text-brand-ink",
  planning: "bg-accent-soft text-accent",
  wrapped: "bg-gray-100 text-gray-500",
};

export default async function OSDashboard() {
  const member = (await currentMember())!;
  const projects = visibleProjects(member);
  const impact = impactRollup(member);
  const funding = fundingRollup(member);
  const deadlines = deadlineRadar(member).slice(0, 4);
  const activity = visibleActivity(member).slice(0, 6);

  // chart data (all permission-scoped)
  const ventures = visibleVentures(member);
  const stageCount = (stage: string) => ventures.filter((v) => v.stage === stage).length;
  const fundingRecords = visibleFunding(member);
  const byStatus = (s: string) =>
    fundingRecords.filter((f) => f.status === s).reduce((n, f) => n + f.amountCAD, 0);
  // Social Studio rollup (only for members who operate it).
  const canSocial = member.role === "marketing" || member.role === "executive";
  const studioPosts = canSocial
    ? readStudioPosts().filter((p) => member.role === "executive" || p.memberId === member.id)
    : [];
  const studioCounts = {
    published: studioPosts.filter((p) => p.status === "published").length,
    scheduled: studioPosts.filter((p) => p.scheduledFor && p.status !== "published").length,
    drafts: studioPosts.filter((p) => p.status !== "published" && !p.scheduledFor).length,
    pending: studioPosts.filter((p) => p.approval === "pending").length,
  };

  // Grants rollup (funding + executive only).
  const showGrants = canUseGrants(member);
  const [grantDiscoveries, grantProposals] = showGrants ? await Promise.all([listDiscoveries(), listProposals()]) : [[], []];
  const grantNew = grantDiscoveries.filter((d) => d.status === "new").length;
  const grantShortlisted = grantDiscoveries.filter((d) => d.status === "shortlisted").length;

  const social = visibleSocial(member);
  const channelViews = ["LinkedIn", "Instagram", "Eventbrite", "Newsletter"]
    .map((ch) => ({
      label: ch,
      value: social.filter((s) => s.channel === ch).reduce((n, s) => n + (s.engagement?.views ?? 0), 0),
    }))
    .filter((c) => c.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good morning, {member.name.split(" ")[0]}
          </h1>
          <p className="text-muted text-sm mt-1">
            Your view of CIBA — {projects.length} collaboration{projects.length === 1 ? "" : "s"}, scoped to your access.
          </p>
        </div>
        {member.role === "executive" && <AddEntity type="project" />}
      </div>

      {/* Impact + funding rollups */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ventures in your programs", value: String(impact.ventures) },
          { label: "Jobs supported", value: String(impact.jobs) },
          { label: "Venture revenue", value: fmtCAD(impact.revenueCAD) },
          { label: "Funding received + committed", value: fmtCAD(funding.receivedCAD + funding.committedCAD) },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-bold text-brand">{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Funding by status</h2>
          <Donut
            centerLabel={fmtCAD(funding.receivedCAD + funding.committedCAD + funding.appliedCAD).replace(".00", "")}
            centerSub="total pipeline"
            slices={[
              { label: "Received", value: byStatus("received"), color: "#0f5c4a" },
              { label: "Committed", value: byStatus("committed"), color: "#2563eb" },
              { label: "Applied", value: byStatus("applied"), color: "#e07a2f" },
            ]}
          />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Venture portfolio by stage</h2>
          <Donut
            centerLabel={String(ventures.length)}
            centerSub="ventures"
            slices={[
              { label: "Idea", value: stageCount("idea"), color: "#8a978f" },
              { label: "Validation", value: stageCount("validation"), color: "#e07a2f" },
              { label: "Growth", value: stageCount("growth"), color: "#0f5c4a" },
              { label: "Operating", value: stageCount("operating"), color: "#2563eb" },
            ]}
          />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Social reach by channel</h2>
          {channelViews.length > 0 ? (
            <HBarChart items={channelViews} format={(v) => `${v.toLocaleString()} views`} />
          ) : (
            <p className="text-sm text-muted">No published posts in your scope yet.</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Collaborations */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold">Your collaborations</h2>
          {projects.map((p) => {
            const lead = getMember(p.leadMemberId);
            return (
              <Link
                key={p.id}
                href={`/os/projects/${p.id}`}
                className="card p-5 block hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      with {p.partnerIds.map((id) => getPartner(id)?.name).filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusPill[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted line-clamp-2">{p.summary}</p>
                <p className="mt-2 text-xs text-muted">
                  Lead: <span className="font-medium text-ink/70">{lead?.name}</span>
                  {p.leadMemberId === member.id && <span className="text-brand font-semibold"> (you)</span>}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {showGrants && (
            <Link href="/os/grants" className="card p-5 block hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-1.5"><Landmark className="w-4 h-4 text-brand" strokeWidth={1.75} /> Grants</h2>
                {grantNew > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">{grantNew} new</span>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Opportunities", value: grantDiscoveries.length },
                  { label: "Shortlisted", value: grantShortlisted },
                  { label: "Proposals", value: grantProposals.length },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xl font-bold text-brand">{s.value}</p>
                    <p className="text-[11px] text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </Link>
          )}

          {canSocial && (
            <Link href="/os/social" className="card p-5 block hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-1.5"><Megaphone className="w-4 h-4 text-brand" strokeWidth={1.75} /> Social Studio</h2>
                {studioCounts.pending > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                    {studioCounts.pending} to approve
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Published", value: studioCounts.published },
                  { label: "Scheduled", value: studioCounts.scheduled },
                  { label: "Drafts", value: studioCounts.drafts },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xl font-bold text-brand">{s.value}</p>
                    <p className="text-[11px] text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </Link>
          )}

          <div className="card p-5">
            <h2 className="font-semibold text-sm flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand" strokeWidth={1.75} /> Deadline radar</h2>
            <p className="text-xs text-muted mt-0.5 mb-3">Funder reports coming due</p>
            <div className="space-y-2.5">
              {deadlines.length === 0 && <p className="text-sm text-muted">No visible deadlines.</p>}
              {deadlines.map((f) => (
                <div key={f.id} className="text-sm border-l-2 border-accent pl-3">
                  <p className="font-medium">{f.source}</p>
                  <p className="text-xs text-muted">
                    due {f.reportDeadline} · {fmtCAD(f.amountCAD)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-sm">Recent activity</h2>
            <div className="mt-3 space-y-3">
              {activity.map((a) => {
                const who = getMember(a.memberId);
                return (
                  <div key={a.id} className="flex gap-2.5 text-sm">
                    <span
                      className="grid place-items-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: who?.avatarColor ?? "#888" }}
                    >
                      {who?.name.split(" ").map((w) => w[0]).join("")}
                    </span>
                    <div>
                      <p className="text-ink/85 leading-snug">{a.action}</p>
                      <p className="text-[11px] text-muted">{new Date(a.when).toLocaleDateString("en-CA")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
