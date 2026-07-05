// Real QuickBooks Online connector (Intuit OAuth 2.0 + Accounting API).
// Configure in .env.local:
//   QBO_CLIENT_ID=...       (developer.intuit.com → app → Keys)
//   QBO_CLIENT_SECRET=...
//   QBO_ENV=sandbox|production   (default sandbox)
//   APP_URL=http://localhost:3001   (redirect URI: {APP_URL}/api/os/connect/quickbooks/callback)

import { getToken, saveToken, type StoredToken } from "./tokens";

export const qboConfig = () => ({
  clientId: process.env.QBO_CLIENT_ID ?? "",
  clientSecret: process.env.QBO_CLIENT_SECRET ?? "",
  env: process.env.QBO_ENV === "production" ? "production" : "sandbox",
  appUrl: process.env.APP_URL ?? "http://localhost:3001",
});

const apiBase = () =>
  qboConfig().env === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

export const qboConfigured = () => Boolean(qboConfig().clientId && qboConfig().clientSecret);
export const qboConnected = () => Boolean(getToken("quickbooks"));

export function qboAuthUrl(): string {
  const { clientId, appUrl } = qboConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/os/connect/quickbooks/callback`,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state: "ciba-os",
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params}`;
}

function basicAuth(): string {
  const { clientId, clientSecret } = qboConfig();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function qboExchangeCode(code: string, realmId: string): Promise<void> {
  const { appUrl } = qboConfig();
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl}/api/os/connect/quickbooks/callback`,
    }),
  });
  if (!res.ok) throw new Error(`QuickBooks token exchange failed: ${await res.text()}`);
  const data = await res.json();
  saveToken("quickbooks", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    meta: { realmId },
  });
}

async function freshToken(): Promise<StoredToken | null> {
  const tok = getToken("quickbooks");
  if (!tok) return null;
  if (tok.expiresAt && tok.expiresAt > Date.now() + 60_000) return tok;
  if (!tok.refreshToken) return tok;
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok.refreshToken }),
  });
  if (!res.ok) return tok;
  const data = await res.json();
  const next: StoredToken = {
    ...tok,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tok.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveToken("quickbooks", next);
  return next;
}

export async function qboCompanyInfo(): Promise<{ name: string; country: string } | null> {
  const tok = await freshToken();
  const realmId = tok?.meta?.realmId;
  if (!tok || !realmId) return null;
  const res = await fetch(
    `${apiBase()}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=73`,
    { headers: { Authorization: `Bearer ${tok.accessToken}`, Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const c = data.CompanyInfo;
  return c ? { name: c.CompanyName, country: c.Country ?? "" } : null;
}

/** Live Profit & Loss for the current fiscal quarter. */
export async function qboProfitAndLoss(): Promise<{ rows: { label: string; amount: number }[] } | null> {
  const tok = await freshToken();
  const realmId = tok?.meta?.realmId;
  if (!tok || !realmId) return null;
  const res = await fetch(
    `${apiBase()}/v3/company/${realmId}/reports/ProfitAndLoss?date_macro=This%20Fiscal%20Quarter&minorversion=73`,
    { headers: { Authorization: `Bearer ${tok.accessToken}`, Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const rows: { label: string; amount: number }[] = [];
  const walk = (items: unknown[]) => {
    for (const it of items as { Summary?: { ColData: { value: string }[] }; Rows?: { Row: unknown[] } }[]) {
      if (it.Summary?.ColData?.length === 2) {
        rows.push({ label: it.Summary.ColData[0].value, amount: Number(it.Summary.ColData[1].value) || 0 });
      }
      if (it.Rows?.Row) walk(it.Rows.Row);
    }
  };
  if (data?.Rows?.Row) walk(data.Rows.Row);
  return { rows };
}
