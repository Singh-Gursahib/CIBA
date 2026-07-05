import { currentMember } from "@/lib/os/auth";
import { bufferConfigured, bufferProfiles } from "@/lib/os/connectors/buffer";
import { gmailConfigured, gmailConnected } from "@/lib/os/connectors/gmail";
import { qboCompanyInfo, qboConfigured, qboConnected } from "@/lib/os/connectors/quickbooks";
import { PROJECTS } from "@/lib/os/seed";
import { allIntegrations, canAccessProject, visibleIntegrations } from "@/lib/os/store";

const kindLabel: Record<string, string> = {
  financing: "Financing",
  social: "Social & Events",
  data: "Data Management",
  crm: "CRM",
  llm: "AI Layer",
};

const kindIcon: Record<string, string> = {
  financing: "💰",
  social: "📣",
  data: "🗂",
  crm: "👥",
  llm: "✦",
};

const statusStyle: Record<string, string> = {
  connected: "bg-brand-soft text-brand-ink",
  syncing: "bg-blue-50 text-blue-700",
  attention: "bg-red-50 text-red-700",
};

type LiveConnector = {
  id: string;
  name: string;
  provider: string;
  purpose: string;
  configured: boolean;
  connected: boolean;
  liveDetail?: string;
  envVars: string[];
  connectHref?: string;
};

async function liveConnectors(): Promise<LiveConnector[]> {
  let qboDetail = "";
  if (qboConnected()) {
    const info = await qboCompanyInfo().catch(() => null);
    if (info) qboDetail = `Connected to "${info.name}"`;
  }
  let bufferDetail = "";
  let bufferOk = false;
  if (bufferConfigured()) {
    try {
      const profiles = await bufferProfiles();
      bufferOk = true;
      bufferDetail = `${profiles.length} channel${profiles.length === 1 ? "" : "s"}: ${profiles
        .map((p) => `${p.service} (@${p.formatted_username})`)
        .join(", ")}`;
    } catch {
      bufferDetail = "Token set but Buffer API unreachable";
    }
  }
  return [
    {
      id: "gmail",
      name: "Gmail",
      provider: "Google OAuth 2.0",
      purpose: "Real organization inbox → /os/inbox (funder emails, founder requests)",
      configured: gmailConfigured(),
      connected: gmailConnected(),
      envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      connectHref: "/api/os/connect/gmail",
    },
    {
      id: "quickbooks",
      name: "QuickBooks Online",
      provider: "Intuit OAuth 2.0",
      purpose: "Live company info + Profit & Loss for the Finance module",
      configured: qboConfigured(),
      connected: qboConnected(),
      liveDetail: qboDetail,
      envVars: ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_ENV"],
      connectHref: "/api/os/connect/quickbooks",
    },
    {
      id: "buffer",
      name: "Buffer",
      provider: "Access token",
      purpose: "Real social publishing — queue posts to LinkedIn/Instagram from CIBA OS",
      configured: bufferConfigured(),
      connected: bufferOk,
      liveDetail: bufferDetail,
      envVars: ["BUFFER_ACCESS_TOKEN"],
    },
  ];
}

export default async function IntegrationsPage() {
  const member = (await currentMember())!;
  const mine = visibleIntegrations(member);
  const mineIds = new Set(mine.map((i) => i.id));
  const all = allIntegrations();
  const live = await liveConnectors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted mt-1">
          Every collaboration plugs into these adapters. You can operate {mine.length} of {all.length} —
          the rest are visible but locked to your role.
        </p>
      </div>

      {/* Live connections — real APIs, activate with credentials */}
      <div className="card p-5 border-brand/30 bg-brand-soft/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">⚡ Live connections</h2>
          <span className="text-[11px] text-muted">
            Real OAuth &amp; APIs — drop credentials in <code className="bg-bg px-1 rounded">.env.local</code> and click connect
          </span>
        </div>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          {live.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{c.name}</p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.connected
                      ? "bg-brand-soft text-brand-ink"
                      : c.configured
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.connected ? "● LIVE" : c.configured ? "ready to connect" : "not configured"}
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">{c.provider}</p>
              <p className="text-xs text-muted mt-2">{c.purpose}</p>
              {c.liveDetail && <p className="text-xs font-medium text-brand-ink mt-2">{c.liveDetail}</p>}
              <div className="mt-3 pt-3 border-t border-line">
                {c.connected ? (
                  <p className="text-xs font-semibold text-brand">✓ Connected</p>
                ) : c.configured && c.connectHref ? (
                  <a href={c.connectHref} className="btn btn-primary !py-1.5 !px-3 text-xs">
                    Connect {c.name} →
                  </a>
                ) : c.configured ? (
                  <p className="text-xs font-semibold text-brand">✓ Token active</p>
                ) : (
                  <p className="text-[11px] text-muted">
                    Set: {c.envVars.map((v) => <code key={v} className="bg-bg px-1 rounded mr-1">{v}</code>)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {all.map((i) => {
          const usable = mineIds.has(i.id);
          const usedBy = PROJECTS.filter(
            (p) => p.integrationIds.includes(i.id) && canAccessProject(member, p.id),
          );
          return (
            <div key={i.id} className={`card p-5 ${usable ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{kindIcon[i.kind]}</span>
                  <div>
                    <p className="font-semibold leading-tight">{i.name}</p>
                    <p className="text-xs text-muted">{kindLabel[i.kind]} · {i.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!usable && <span className="text-xs">🔒</span>}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle[i.status]}`}>
                    {i.status}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{i.description}</p>
              <p className="mt-2 text-[11px] text-muted">
                Last sync: {new Date(i.lastSync).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              {usedBy.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                    Used by your collaborations
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {usedBy.map((p) => (
                      <span key={p.id} className="pill">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {i.status === "attention" && usable && (
                <p className="mt-3 text-xs font-medium text-red-700 bg-red-50 rounded-lg px-3 py-2">
                  Airtable sync token expires in 3 days — reconnect to keep venture metrics current for the
                  PacifiCan Q2 report.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
