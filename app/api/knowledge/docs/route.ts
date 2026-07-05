import { NextResponse } from "next/server";
import { listDocMeta } from "@/lib/content/data";

/** Lightweight doc list for the Cmd+K quick-open. */
export async function GET() {
  const docs = await listDocMeta();
  return NextResponse.json({ docs });
}
