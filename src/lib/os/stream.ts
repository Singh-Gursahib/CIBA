// NDJSON streaming — one JSON object per line. Used for the grant-scan progress
// feed (discrete per-funder events). Framework-agnostic; server produces, client
// reads.

export type StreamEvent = { type: string; [k: string]: unknown };

/** Wrap an async producer as a streaming Response of newline-delimited JSON. */
export function ndjsonStream(producer: (emit: (e: StreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await producer(emit);
        emit({ type: "done" });
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "stream failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}

/** Client: read an NDJSON response, calling onEvent per line. */
export async function readNdjson(res: Response, onEvent: (e: StreamEvent) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (t) onEvent(JSON.parse(t) as StreamEvent);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf.trim()) as StreamEvent);
}
