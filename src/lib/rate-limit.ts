import { getCloudflareContext } from "@opennextjs/cloudflare";

type Bucket = "WRITES" | "READS" | "ADMIN" | "MEDIA" | "UNI_EMAIL";

/**
 * Per-client rate limit using the Workers Rate Limiting bindings in wrangler.jsonc. Returns a 429 response when
 * the caller is over the limit, otherwise null. Keyed on the user id when known, else the client IP.
 * Fails open if the binding is missing (local `next dev`).
 */
export async function limited(req: Request, bucket: Bucket, userId?: string | null): Promise<Response | null> {
  return limitedBy(bucket, [userId ?? clientIp(req)]);
}

export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? "anon";

/** Like `limited`, with explicit keys: over the limit on any one of them returns the 429. */
export async function limitedBy(bucket: Bucket, keys: string[]): Promise<Response | null> {
  const binding = (getCloudflareContext().env as unknown as Record<string, RateLimit | undefined>)[`RL_${bucket}`];
  if (!binding) return null;
  const results = await Promise.all(keys.map((key) => binding.limit({ key: `${bucket}:${key}` })));
  if (results.every((r) => r.success)) return null;
  return Response.json({ error: "Too many requests. Slow down and try again shortly." }, { status: 429, headers: { "retry-after": "60" } });
}
