import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/config";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

/** Serves generated assets and uploads from the data/ directory. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const relPath = segments.map(decodeURIComponent).join("/");
  const abs = path.resolve(DATA_DIR, relPath);

  // Path traversal guard: must stay inside data/
  if (!abs.startsWith(DATA_DIR + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  const ext = path.extname(abs).toLowerCase();
  const type = CONTENT_TYPES[ext];
  if (!type) return new Response("Unsupported file type", { status: 415 });

  try {
    const data = await fs.readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
