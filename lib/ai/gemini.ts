import "server-only";
import { geminiTextModel, requireEnv } from "@/lib/config";

/** Minimal Gemini REST client (server-only). Ported from the FirstResponders app. */

const FALLBACK_MODEL = "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  thoughtSignature?: string;
}
export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

type JsonSchema = Record<string, unknown>;

export interface GenerateOptions {
  system: string;
  contents: GeminiContent[];
  tools?: FunctionDeclaration[];
  /** Enable Google Search grounding (Phase 4 grant scout). */
  googleSearch?: boolean;
  /** Force a JSON response shaped by this schema. */
  responseSchema?: JsonSchema;
  temperature?: number;
}

export interface GenerateResult {
  content: GeminiContent | null;
  /** Grounding source URLs when googleSearch is used. */
  groundingUrls: { title: string; url: string }[];
}

async function postWithRetry(model: string, body: unknown, key: string): Promise<Response> {
  const models = model === FALLBACK_MODEL ? [model] : [model, FALLBACK_MODEL];
  let last: Response | null = null;
  for (const m of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${BASE}/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      last = res;
      if (res.status === 429 || res.status >= 500) {
        await sleep(600 * (attempt + 1) ** 2);
        continue;
      }
      break;
    }
  }
  return last!;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const key = requireEnv("GEMINI_API_KEY");
  const generationConfig: Record<string, unknown> = { temperature: opts.temperature ?? 0.6 };
  if (opts.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = opts.responseSchema;
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig,
  };

  const tools: unknown[] = [];
  if (opts.tools?.length) tools.push({ functionDeclarations: opts.tools });
  if (opts.googleSearch) tools.push({ googleSearch: {} });
  if (tools.length) {
    body.tools = tools;
    if (opts.tools?.length) body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }

  const res = await postWithRetry(geminiTextModel(), body, key);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429 || res.status >= 500) {
      throw new Error("The model is busy right now. Please try again in a moment.");
    }
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const groundingUrls: { title: string; url: string }[] = (
    candidate?.groundingMetadata?.groundingChunks ?? []
  )
    .map((c: { web?: { uri?: string; title?: string } }) =>
      c.web?.uri ? { url: c.web.uri, title: c.web.title || c.web.uri } : null
    )
    .filter(Boolean);

  return { content: candidate?.content ?? null, groundingUrls };
}

/** Convenience: single-shot text generation, returns plain string. */
export async function generateText(opts: GenerateOptions): Promise<string> {
  const { content } = await generate(opts);
  return (content?.parts ?? []).map((p) => p.text).filter(Boolean).join("").trim();
}

/** Convenience: single-shot JSON generation validated against a schema. */
export async function generateJson<T>(opts: GenerateOptions & { responseSchema: JsonSchema }): Promise<T> {
  const text = await generateText(opts);
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
