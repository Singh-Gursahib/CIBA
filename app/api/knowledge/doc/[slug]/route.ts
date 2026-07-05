import { NextResponse } from "next/server";
import { getDoc } from "@/lib/content/loader";
import { getLinks } from "@/lib/content/graph";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { backlinks } = await getLinks(slug);
  return NextResponse.json({ doc, backlinks });
}
