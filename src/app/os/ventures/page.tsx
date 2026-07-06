import { Donut, HBarChart } from "@/components/charts";
import { AddEntity } from "@/components/add-entity";
import { currentMember } from "@/lib/os/auth";
import { allProjects, canAccessProject, fmtCAD, visibleProjects, visibleVentures } from "@/lib/os/store";

const stageColor: Record<string, string> = {
  idea: "#8a978f",
  validation: "#e07a2f",
  growth: "#0f5c4a",
  operating: "#2563eb",
};

export default async function VenturesPage() {
  const member = (await currentMember())!;
  const PROJECTS = allProjects();
  const projectOpts = visibleProjects(member).map((p) => ({ id: p.id, name: p.name }));
  const ventures = visibleVentures(member).sort(
    (a, b) => b.metrics.revenueCAD - a.metrics.revenueCAD,
  );

  const totals = {
    jobs: ventures.reduce((n, v) => n + v.metrics.jobs, 0),
    revenue: ventures.reduce((n, v) => n + v.metrics.revenueCAD, 0),
    raised: ventures.reduce((n, v) => n + v.metrics.raisedCAD, 0),
  };

  const sectors = [...new Set(ventures.map((v) => v.sector))].map((s, i) => ({
    label: s,
    value: ventures.filter((v) => v.sector === s).length,
    color: ["#0f5c4a", "#2563eb", "#7c3aed", "#e07a2f", "#b23b3b", "#0891b2"][i % 6],
  }));

  const revenueBySector = [...new Set(ventures.map((v) => v.sector))]
    .map((s) => ({
      label: s,
      value: ventures.filter((v) => v.sector === s).reduce((n, v) => n + v.metrics.revenueCAD, 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Venture Portfolio</h1>
          <p className="text-sm text-muted mt-1">
            Every venture in your visible programs — the numbers behind CIBA&apos;s funder reports.
          </p>
        </div>
        {projectOpts.length > 0 && <AddEntity type="venture" projects={projectOpts} />}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-brand">{totals.jobs}</p>
          <p className="text-xs text-muted mt-1">Jobs supported</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-brand">{fmtCAD(totals.revenue)}</p>
          <p className="text-xs text-muted mt-1">Combined venture revenue</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-brand">{fmtCAD(totals.raised)}</p>
          <p className="text-xs text-muted mt-1">Capital raised</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Portfolio by sector</h2>
          <Donut centerLabel={String(ventures.length)} centerSub="ventures" slices={sectors} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Revenue by sector</h2>
          <HBarChart items={revenueBySector} format={(v) => fmtCAD(v)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg text-left">
              <th className="px-4 py-3 font-semibold">Venture</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Programs</th>
              <th className="px-4 py-3 font-semibold text-right">Jobs</th>
              <th className="px-4 py-3 font-semibold text-right">Revenue</th>
              <th className="px-4 py-3 font-semibold text-right hidden sm:table-cell">Raised</th>
            </tr>
          </thead>
          <tbody>
            {ventures.map((v) => (
              <tr key={v.id} className="border-b border-line last:border-0 hover:bg-bg/60">
                <td className="px-4 py-3">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-muted">{v.founder} · {v.sector}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: stageColor[v.stage] }}
                  >
                    {v.stage}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {v.projectIds
                      .filter((id) => canAccessProject(member, id))
                      .map((id) => (
                        <span key={id} className="pill">{PROJECTS.find((p) => p.id === id)?.name}</span>
                      ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{v.metrics.jobs}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtCAD(v.metrics.revenueCAD)}</td>
                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                  {v.metrics.raisedCAD > 0 ? fmtCAD(v.metrics.raisedCAD) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
