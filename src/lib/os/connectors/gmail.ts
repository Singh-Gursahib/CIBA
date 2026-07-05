// Real Gmail connector (OAuth 2.0 + Gmail REST API).
// Configure in .env.local:
//   GOOGLE_CLIENT_ID=...        (Google Cloud Console → OAuth client, type "Web")
//   GOOGLE_CLIENT_SECRET=...
//   APP_URL=http://localhost:3001   (redirect URI to whitelist: {APP_URL}/api/os/connect/gmail/callback)

import { getToken, saveToken, type StoredToken } from "./tokens";

const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const gmailConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:3001",
});

export const gmailConfigured = () => Boolean(gmailConfig().clientId && gmailConfig().clientSecret);
export const gmailConnected = () => Boolean(getToken("gmail"));

export function gmailAuthUrl(): string {
  const { clientId, appUrl } = gmailConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/os/connect/gmail/callback`,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function gmailExchangeCode(code: string): Promise<void> {
  const { clientId, clientSecret, appUrl } = gmailConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl}/api/os/connect/gmail/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = await res.json();
  saveToken("gmail", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
}

async function freshToken(): Promise<StoredToken | null> {
  const tok = getToken("gmail");
  if (!tok) return null;
  if (tok.expiresAt && tok.expiresAt > Date.now() + 60_000) return tok;
  if (!tok.refreshToken) return tok;
  const { clientId, clientSecret } = gmailConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tok.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return tok;
  const data = await res.json();
  const next: StoredToken = {
    ...tok,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveToken("gmail", next);
  return next;
}

export type GmailMessage = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
};

export async function gmailListMessages(max = 12): Promise<GmailMessage[]> {
  const tok = await freshToken();
  if (!tok) throw new Error("Gmail not connected");
  const auth = { Authorization: `Bearer ${tok.accessToken}` };

  const list = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=in:inbox`,
    { headers: auth },
  );
  if (!list.ok) throw new Error(`Gmail list failed: ${await list.text()}`);
  const { messages = [] } = await list.json();

  const detail = await Promise.all(
    messages.map(async (m: { id: string }) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: auth },
      );
      if (!res.ok) return null;
      const msg = await res.json();
      const header = (name: string) =>
        msg.payload?.headers?.find((h: { name: string; value: string }) => h.name === name)?.value ?? "";
      return {
        id: msg.id,
        from: header("From"),
        subject: header("Subject") || "(no subject)",
        date: header("Date"),
        snippet: msg.snippet ?? "",
      } satisfies GmailMessage;
    }),
  );
  return detail.filter(Boolean) as GmailMessage[];
}
