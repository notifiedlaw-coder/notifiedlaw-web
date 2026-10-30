/**
 * Kimi K3 (Moonshot AI) chat client. The API is OpenAI-compatible: POST {base}/chat/completions with a bearer key.
 * Configure with Worker secrets / .dev.vars: KIMI_API_KEY (required), KIMI_MODEL (default "kimi-k3") and
 * KIMI_BASE_URL (default https://api.moonshot.ai/v1). With no key, `kimiConfigured()` is false and callers answer
 * "unavailable" instead of failing. Swapping the model provider means changing only this file.
 */

const DEFAULT_BASE = "https://api.moonshot.ai/v1";
export const KIMI_MODEL = () => process.env.KIMI_MODEL || "kimi-k3";

export class AiUnavailable extends Error {}

export const kimiConfigured = () => !!process.env.KIMI_API_KEY;

type Reply = { choices?: { message?: { content?: string }; finish_reason?: string }[] };

/**
 * One system + user exchange that must answer with a JSON object. Returns the reply text (not yet parsed).
 * Throws AiUnavailable when there is no key, the API cannot be reached, answers an error, or the reply is cut off.
 */
export async function kimiJson(system: string, user: string, opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<string> {
  const key = process.env.KIMI_API_KEY;
  if (!key) throw new AiUnavailable("KIMI_API_KEY is not set");
  const base = (process.env.KIMI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: KIMI_MODEL(),
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: opts.maxTokens ?? 3000,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    });
  } catch (e) {
    throw new AiUnavailable(`Kimi request failed: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok) throw new AiUnavailable(`Kimi answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const body = (await res.json().catch(() => null)) as Reply | null;
  const choice = body?.choices?.[0];
  if (!choice?.message?.content) throw new AiUnavailable("Kimi sent no content");
  if (choice.finish_reason === "length") throw new AiUnavailable("Kimi's reply was cut off");
  return choice.message.content;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const base = () => (process.env.KIMI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");

/**
 * A chat completion as it streams: yields the text of each delta. Throws AiUnavailable if the API cannot be reached
 * or answers an error (before the first yield) or the stream breaks; `signal` ends it early (the user pressed Stop).
 */
export async function* kimiStream(messages: ChatMessage[], opts: { maxTokens?: number; signal?: AbortSignal } = {}): AsyncGenerator<string> {
  const key = process.env.KIMI_API_KEY;
  if (!key) throw new AiUnavailable("KIMI_API_KEY is not set");
  let res: Response;
  try {
    res = await fetch(`${base()}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: KIMI_MODEL(), messages, stream: true, temperature: 0.3, max_tokens: opts.maxTokens ?? 2500 }),
      signal: opts.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) return;
    throw new AiUnavailable(`Kimi request failed: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok || !res.body) throw new AiUnavailable(`Kimi answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const text = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch { /* a keep-alive or partial line */ }
      }
    }
  } catch (e) {
    if (opts.signal?.aborted) return;
    throw new AiUnavailable(`Kimi stream broke: ${e instanceof Error ? e.message : e}`);
  }
}

/**
 * The text of a document, read by Moonshot's file-extract service (upload with purpose "file-extract", read the
 * content back, delete the upload). Used for PDFs, whose text cannot be read reliably in the Worker.
 */
export async function kimiExtract(bytes: Uint8Array<ArrayBuffer>, name: string): Promise<string> {
  const key = process.env.KIMI_API_KEY;
  if (!key) throw new AiUnavailable("KIMI_API_KEY is not set");
  const auth = { authorization: `Bearer ${key}` };
  const form = new FormData();
  form.set("purpose", "file-extract");
  form.set("file", new Blob([bytes], { type: "application/pdf" }), name);
  try {
    const up = await fetch(`${base()}/files`, { method: "POST", headers: auth, body: form, signal: AbortSignal.timeout(60_000) });
    if (!up.ok) throw new AiUnavailable(`Kimi file upload answered ${up.status}`);
    const { id } = (await up.json()) as { id?: string };
    if (!id) throw new AiUnavailable("Kimi gave no file id");
    try {
      const res = await fetch(`${base()}/files/${id}/content`, { headers: auth, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new AiUnavailable(`Kimi file content answered ${res.status}`);
      const raw = await res.text();
      // The service answers JSON with a "content" field; fall back to the raw text.
      try { return String((JSON.parse(raw) as { content?: unknown }).content ?? raw); } catch { return raw; }
    } finally {
      void fetch(`${base()}/files/${id}`, { method: "DELETE", headers: auth }).catch(() => {});
    }
  } catch (e) {
    throw e instanceof AiUnavailable ? e : new AiUnavailable(`Kimi file extract failed: ${e instanceof Error ? e.message : e}`);
  }
}

/** A short plain-text completion (no JSON, no streaming), such as a conversation title. */
export async function kimiText(system: string, user: string, opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<string> {
  const key = process.env.KIMI_API_KEY;
  if (!key) throw new AiUnavailable("KIMI_API_KEY is not set");
  try {
    const res = await fetch(`${base()}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: KIMI_MODEL(), messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.2, max_tokens: opts.maxTokens ?? 40 }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    });
    if (!res.ok) throw new AiUnavailable(`Kimi answered ${res.status}`);
    const text = ((await res.json()) as Reply).choices?.[0]?.message?.content;
    if (!text) throw new AiUnavailable("Kimi sent no content");
    return text;
  } catch (e) {
    throw e instanceof AiUnavailable ? e : new AiUnavailable(`Kimi request failed: ${e instanceof Error ? e.message : e}`);
  }
}
