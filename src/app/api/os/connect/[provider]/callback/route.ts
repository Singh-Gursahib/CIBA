import { NextResponse } from "next/server";
import { gmailExchangeCode } from "@/lib/os/connectors/gmail";
import { qboExchangeCode } from "@/lib/os/connectors/quickbooks";

// OAuth callback for Gmail and QuickBooks — exchanges the code, stores tokens,
// then bounces back to the Integrations page.
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const appUrl = process.env.APP_URL ?? "http://localhost:3001";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/os/integrations?error=denied`);
  }

  try {
    if (provider === "gmail") {
      await gmailExchangeCode(code);
    } else if (provider === "quickbooks") {
      const realmId = url.searchParams.get("realmId") ?? "";
      await qboExchangeCode(code, realmId);
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
    }
    return NextResponse.redirect(`${appUrl}/os/integrations?connected=${provider}`);
  } catch (err) {
    console.error(`${provider} OAuth callback failed:`, err);
    return NextResponse.redirect(`${appUrl}/os/integrations?error=${provider}`);
  }
}
