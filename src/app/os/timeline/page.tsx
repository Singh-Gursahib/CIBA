import { Timeline } from "@/components/charts";
import { currentMember } from "@/lib/os/auth";
import { readStudioPosts } from "@/lib/os/social/read-sync";
import { deadlineRadar, getPartner, visibleProjects } from "@/lib/os/store";

const statusColor: Record<string, string> = {
  active: "#0f5c4a",
  planning: "#e07a2f",
  wrapped: "#8a978f",
};

export default async function TimelinePage() {
  const member = (await currentMember())!;
  const projects = visibleProjects(member).sort((a, b) => (a.start < b.start ? -1 : 1));
  const deadlines = deadlineRadar(member);

  // Published Social Studio posts appear as timeline markers (scoped).
  const canSocial = member.role === "marketing" || member.role === "executive";
  const studioMarkers = canSocial
    ? readStudioPosts()
        .filter((p) => (member.role === "executive" || p.memberId === member.id) && p.status === "published" && p.publishedAt)
        .map((p) => ({ date: p.publishedAt!.slice(0, 10), label: `${p.channelBrand} post` }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted mt-1">
          Every collaboration in your scope across time — red dots are funder report deadlines.
        </p>
      </div>

      <div className="card p-6">
        <Timeline
          domainStart="2023-06-01"
          domainEnd="2026-12-31"
          today="2026-07-01"
          rows={projects.map((p) => ({
            label: p.name,
            start: p.start,
            end: p.end,
            color: statusColor[p.status],
            sub: p.partnerIds.map((id) => getPartner(id)?.name.split(" (")[0]).filter(Boolean).join(", "),
          }))}
          markers={[
            ...deadlines.map((f) => ({
              date: f.reportDeadline!,
              label: `${f.source.split(" (")[0]} report`,
            })),
            ...studioMarkers,
          ]}
        />
        <div className="mt-6 pt-4 border-t border-line flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: "#0f5c4a" }} /> Active</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: "#8a978f" }} /> Wrapped</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Report deadline</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-0.5 h-3 bg-accent inline-block" /> Today</span>
        </div>
      </div>

      {/* Deadline list */}
      <div className="card p-6">
        <h2 className="font-semibold">Report deadlines in your scope</h2>
        <div className="mt-3 divide-y divide-line">
          {deadlines.length === 0 && <p className="text-sm text-muted">None visible.</p>}
          {deadlines.map((f) => {
            const days = Math.ceil(
              (new Date(f.reportDeadline!).getTime() - new Date("2026-07-01").getTime()) / 86400000,
            );
            return (
              <div key={f.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{f.source}</p>
                  <p className="text-xs text-muted">{f.notes}</p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    days <= 21 ? "bg-red-50 text-red-700" : days <= 60 ? "bg-accent-soft text-accent" : "bg-bg text-muted"
                  }`}
                >
                  {days}d — {f.reportDeadline}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
