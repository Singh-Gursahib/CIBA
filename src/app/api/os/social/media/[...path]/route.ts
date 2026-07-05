import { promises as fs } from "node:fs";
import path from "node:path";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { DATA_DIR } from "@/lib/os/social/config";

const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

/** Serves rendered/uploaded media from .data/social/ (operators only). */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const member = await currentMember();
  if (!member || !canOperateSocial(member)) return new Response("Forbidden", { status: 403 });

  const { path: segments } = await ctx.params;
  const rel = segments.map(decodeURIComponent).join("/");
  const abs = path.resolve(DATA_DIR, rel);
  const root = path.join(DATA_DIR, "social");
  if (!abs.startsWith(root + path.sep)) return new Response("Forbidden", { status: 403 });

  const type = TYPES[path.extname(abs).toLowerCase()];
  if (!type) return new Response("Unsupported", { status: 415 });
  try {
    const data = await fs.readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
