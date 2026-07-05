import "server-only";

export type StreamEvent = Record<string, unknown> & { type: string };

/**
 * Builds an NDJSON ReadableStream. The producer receives an `emit` function
 * and returns a promise; the stream closes when it settles.
 */
export function ndjsonStream(
  producer: (emit: (event: StreamEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        await producer(emit);
        emit({ type: "done" });
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Something went wrong" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
