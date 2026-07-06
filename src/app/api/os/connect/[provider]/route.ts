import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { gmailAuthUrl, gmailConfigured } from "@/lib/os/connectors/gmail";
import { qboAuthUrl, qboConfigured } from "@/lib/os/connectors/quickbooks";
import { deleteToken } from "@/lib/os/connectors/tokens";
import type { Member } from "@/lib/os/types";

// Which integration id (if any) a provider maps to. Connecting/disconnecting a
// real org connection is a scoped action: you must be able to operate that
// integration (or be an executive) — otherwise anyone could drop the org's
// Gmail/QuickBooks tokens.
const INTEGRATION_FOR: Record<string, string> = { quickbooks: "int-quickbooks" };

function canOperateConnection(member: Member, provider: string): boolean {
  if (member.integrationAccess === "*") return true;
  const intId = INTEGRATION_FOR[provider];
  return intId ? member.integrationAccess.includes(intId) : member.role === "executive";
}

// GET /api/os/connect/gmail | quickbooks → redirect into the provider's OAuth flow
export async function GET(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { provider } = await ctx.params;
  if (!canOperateConnection(member, provider)) {
    return NextResponse.json({ error: "You do not have access to operate this integration." }, { status: 403 });
  }
  if (provider === "gmail") {
    if (!gmailConfigured()) {
      return NextResponse.json(
        { error: "Gmail not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local" },
        { status: 400 },
      );
    }
    return NextResponse.redirect(gmailAuthUrl());
  }
  if (provider === "quickbooks") {
    if (!qboConfigured()) {
      return NextResponse.json(
        { error: "QuickBooks not configured. Set QBO_CLIENT_ID and QBO_CLIENT_SECRET in .env.local" },
        { status: 400 },
      );
    }
    return NextResponse.redirect(qboAuthUrl());
  }
  return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
}

// DELETE → disconnect (drop stored tokens)
export async function DELETE(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { provider } = await ctx.params;
  if (!canOperateConnection(member, provider)) {
    return NextResponse.json({ error: "You do not have access to operate this integration." }, { status: 403 });
  }
  deleteToken(provider);
  return NextResponse.json({ ok: true });
}
