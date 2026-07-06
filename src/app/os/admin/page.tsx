import { Lock } from "lucide-react";
import { currentMember, impersonator } from "@/lib/os/auth";
import { ACTIVITY, INTEGRATIONS, MEMBERS, PROJECTS } from "@/lib/os/seed";
import { getMember } from "@/lib/os/store";
import { ViewAsButton } from "../impersonation-banner";

export default async function AdminPage() {
  const member = (await currentMember())!;
  const admin = await impersonator();
  const isExec = member.role === "executive" || !!admin;

  if (!isExec) {
    return (
      <div className="card p-10 text-center">
        <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-soft mx-auto"><Lock className="w-5 h-5 text-brand" strokeWidth={1.75} /></div>
        <h1 className="mt-3 text-xl font-bold">Admin only</h1>
        <p className="mt-1 text-sm text-muted">
          Only the Executive Director can manage accounts and view the audit log.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">
          Team accounts, their access, and the audit trail. Use <strong>View as</strong> to enter any
          member&apos;s account — you&apos;ll see exactly what they see, with a banner to return.
        </p>
      </div>

      {/* Accounts + view-as */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-line bg-bg text-left">
              <th className="px-4 py-3 font-semibold">Member</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Collaborations</th>
              <th className="px-4 py-3 font-semibold">Integrations</th>
              <th className="px-4 py-3 font-semibold text-right">Account</th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0 align-top hover:bg-bg/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid place-items-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0"
                      style={{ background: m.avatarColor }}
                    >
                      {m.name.split(" ").map((w) => w[0]).join("")}
                    </span>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="pill">{m.role}</span>
                </td>
                <td className="px-4 py-3">
                  {m.projectAccess === "*" ? (
                    <span className="text-xs font-semibold text-brand">All ({PROJECTS.length})</span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-64">
                      {m.projectAccess.map((pid) => (
                        <span key={pid} className="text-[10px] px-1.5 py-0.5 rounded bg-bg border border-line text-muted">
                          {PROJECTS.find((p) => p.id === pid)?.name ?? pid}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.integrationAccess === "*" ? (
                    <span className="text-xs font-semibold text-brand">All ({INTEGRATIONS.length})</span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {m.integrationAccess.map((iid) => (
                        <span key={iid} className="text-[10px] px-1.5 py-0.5 rounded bg-bg border border-line text-muted">
                          {INTEGRATIONS.find((i) => i.id === iid)?.name ?? iid}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <ViewAsButton memberId={m.id} disabled={m.id === member.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Access matrix */}
      <div className="card p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Access matrix — who sees which collaboration</h2>
        <table className="text-xs min-w-[640px]">
          <thead>
            <tr>
              <th className="text-left pr-4 pb-2 font-semibold">Collaboration</th>
              {MEMBERS.map((m) => (
                <th key={m.id} className="px-3 pb-2 font-semibold text-center">
                  {m.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="pr-4 py-2 font-medium">{p.name}</td>
                {MEMBERS.map((m) => {
                  const has = m.projectAccess === "*" || m.projectAccess.includes(p.id);
                  const lead = p.leadMemberId === m.id;
                  return (
                    <td key={m.id} className="px-3 py-2 text-center">
                      {lead ? (
                        <span className="text-brand font-bold" title="Project lead">★</span>
                      ) : has ? (
                        <span className="text-brand">●</span>
                      ) : (
                        <span className="text-line">○</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-muted">★ lead · ● access · ○ no access</p>
      </div>

      {/* Audit log */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3">Audit log</h2>
        <div className="divide-y divide-line">
          {ACTIVITY.map((a) => {
            const who = getMember(a.memberId);
            const proj = a.projectId ? PROJECTS.find((p) => p.id === a.projectId) : null;
            return (
              <div key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span
                  className="grid place-items-center w-7 h-7 rounded-full text-white text-[10px] font-bold shrink-0"
                  style={{ background: who?.avatarColor ?? "#888" }}
                >
                  {who?.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="font-medium">{who?.name}</span> — {a.action}
                  </p>
                  <p className="text-[11px] text-muted">
                    {new Date(a.when).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                    {proj && <> · {proj.name}</>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
