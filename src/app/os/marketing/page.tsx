import { Palette } from "lucide-react";
import { currentMember } from "@/lib/os/auth";
import { visibleProjects } from "@/lib/os/store";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { listJobs } from "@/lib/os/marketing/store";
import { PageHeader } from "@/components/ui";
import { MarketingView } from "./marketing-view";

export default async function MarketingPage() {
  const member = (await currentMember())!;
  if (!canUseMarketing(member)) {
    return (
      <div className="space-y-5">
        <PageHeader title="Marketing Studio" subtitle="Generate on-brand posters for CIBA programs and events." icon={<Palette />} />
        <div className="card p-8 text-center">
          <p className="text-3xl">🔒</p>
          <p className="mt-3 font-semibold">Marketing Studio is scoped to Marketing</p>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">Poster generation is limited to the Marketing Coordinator (Jake) and the Executive Director.</p>
        </div>
      </div>
    );
  }
  const all = await listJobs();
  const jobs = member.role === "executive" ? all : all.filter((j) => j.memberId === member.id);
  const projects = visibleProjects(member).map((p) => ({ id: p.id, name: p.name }));
  return <MarketingView jobs={jobs} projects={projects} />;
}
