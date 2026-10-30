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
