import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Megaphone, Film, FolderOpen, Lock, Rocket } from "lucide-react";
import { currentMember } from "@/lib/os/auth";
import { SectionTitle } from "@/components/ui";
import { readStudioPosts } from "@/lib/os/context";
import {
  fmtCAD,
  getIntegration,
  getMember,
  getPartner,
  getProject,
  visibleDocs,
  visibleFunding,
  visibleSocial,
  visibleVentures,
} from "@/lib/os/store";

const fundingPill: Record<string, string> = {
  received: "bg-brand-soft text-brand-ink",
  committed: "bg-blue-50 text-blue-700",
  applied: "bg-accent-soft text-accent",
  "reporting-due": "bg-red-50 text-red-700",
};

const postPill: Record<string, string> = {
  published: "bg-brand-soft text-brand-ink",
  scheduled: "bg-blue-50 text-blue-700",
  draft: "bg-gray-100 text-gray-500",
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = (await currentMember())!;
  const project = getProject(member, id);
  if (!project) notFound();

  const funding = visibleFunding(member, project.id);
  const social = visibleSocial(member, project.id);
  const docs = visibleDocs(member, project.id);
  const ventures = visibleVentures(member, project.id);
  const lead = getMember(project.leadMemberId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/os" className="text-sm text-muted hover:text-brand-ink">← Dashboard</Link>
        <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">{project.summary}</p>
          </div>
          <span className="pill">{project.programTag}</span>
        </div>
      </div>

      {/* Partners + team + integrations strip */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="label">Partners</p>
          <div className="space-y-2">
            {project.partnerIds.map((pid) => {
              const p = getPartner(pid);
              return p ? (
                <div key={pid} className="text-sm">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.kind} · {p.region}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>
        <div className="card p-4">
          <p className="label">Team on this collaboration</p>
          <div className="flex flex-wrap gap-2">
            {project.memberIds.map((mid) => {
              const m = getMember(mid);
              return m ? (
                <span key={mid} className="inline-flex items-center gap-1.5 text-xs font-medium bg-bg border border-line rounded-full px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: m.avatarColor }} />
                  {m.name}
                  {mid === project.leadMemberId && <span className="text-brand font-semibold">· lead</span>}
                </span>
              ) : null;
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Lead: {lead?.name}</p>
        </div>
        <div className="card p-4">
          <p className="label">Integrations in use</p>
          <div className="space-y-1.5">
            {project.integrationIds.map((iid) => {
              const i = getIntegration(iid);
              return i ? (
                <p key={iid} className="text-sm">
                  <span className="font-medium">{i.name}</span>{" "}
                  <span className="text-xs text-muted">({i.provider})</span>
                </p>
              ) : null;
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Funding */}
        <div className="card p-5">
          <SectionTitle icon={<Banknote />}>Funding</SectionTitle>
          <div className="mt-3 space-y-3">
            {funding.length === 0 && <p className="text-sm text-muted">No funding records visible to you.</p>}
            {funding.map((f) => (
              <div key={f.id} className="border border-line rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm">{f.source}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${fundingPill[f.status]}`}>
                    {f.status}
                  </span>
                </div>
                <p className="text-lg font-bold text-brand mt-1">{fmtCAD(f.amountCAD)}</p>
                <p className="text-xs text-muted mt-1">{f.notes}</p>
                {f.reportDeadline && (
                  <p className="text-xs font-medium text-accent mt-1.5">Report due {f.reportDeadline}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Social */}
        <div className="card p-5">
          <SectionTitle icon={<Megaphone />}>Social & outreach</SectionTitle>
          <div className="mt-3 space-y-3">
            {social.length === 0 && <p className="text-sm text-muted">No posts for this collaboration.</p>}
            {social.map((s) => (
              <div key={s.id} className="border border-line rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-muted">{s.channel} · {s.date}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${postPill[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-sm mt-1.5">{s.content}</p>
                {s.engagement && (
                  <p className="text-xs text-muted mt-1.5">
                    {s.engagement.views.toLocaleString()} views · {s.engagement.clicks} clicks
                  </p>
                )}
              </div>
            ))}

            {(() => {
              const studioVideos = readStudioPosts().filter((p) => p.projectId === id);
              if (studioVideos.length === 0) return null;
              return (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                    Studio videos
                  </p>
                  <div className="space-y-2">
                    {studioVideos.map((v) => (
                      <div key={v.id} className="border border-line rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-muted shrink-0" /> {v.title}</p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {v.channelBrand} · {v.format}
                            {v.targets?.length ? ` · ${v.targets.map((t) => t.platform).join(", ")}` : ""}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${postPill[v.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link href="/os/social" className="inline-block mt-2 text-xs font-semibold text-brand hover:underline">
                    Open Social Studio →
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Documents */}
        <div className="card p-5">
          <SectionTitle icon={<FolderOpen />}>Documents</SectionTitle>
          <p className="text-xs text-muted mt-0.5">
            Sensitive documents are visible only to the project lead and executives.
          </p>
          <div className="mt-3 divide-y divide-line">
            {docs.length === 0 && <p className="text-sm text-muted">No documents visible to you.</p>}
            {docs.map((d) => {
              const owner = getMember(d.owner);
              return (
                <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {d.name} {d.sensitive && <span className="text-[10px] text-red-600 font-semibold inline-flex items-center gap-0.5 align-middle"><Lock className="w-2.5 h-2.5" /> sensitive</span>}
                    </p>
                    <p className="text-xs text-muted">{d.type} · updated {d.updated} · {owner?.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ventures */}
        <div className="card p-5">
          <SectionTitle icon={<Rocket />}>Ventures in this program</SectionTitle>
          <div className="mt-3 space-y-3">
            {ventures.length === 0 && <p className="text-sm text-muted">No ventures recorded.</p>}
            {ventures.map((v) => (
              <div key={v.id} className="border border-line rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm">{v.name}</p>
                  <span className="pill">{v.stage}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{v.founder} · {v.sector}</p>
                <p className="text-xs text-muted mt-1.5">
                  {v.metrics.jobs} jobs · {fmtCAD(v.metrics.revenueCAD)} revenue
                  {v.metrics.raisedCAD > 0 && <> · {fmtCAD(v.metrics.raisedCAD)} raised</>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
