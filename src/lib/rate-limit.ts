import { getCloudflareContext } from "@opennextjs/cloudflare";

type Bucket = "WRITES" | "READS" | "ADMIN" | "MEDIA";

/**
 * Per-client rate limit using the Workers Rate Limiting bindings in wrangler.jsonc. Returns a 429 response when
 * the caller is over the limit, otherwise null. Keyed on the user id when known, else the client IP.
 * Fails open if the binding is missing (local `next dev`).
 */
export async function limited(req: Request, bucket: Bucket, userId?: string | null): Promise<Response | null> {
  const binding = (getCloudflareContext().env as unknown as Record<string, RateLimit | undefined>)[`RL_${bucket}`];
  if (!binding) return null;
  const key = userId ?? req.headers.get("cf-connecting-ip") ?? "anon";
  const { success } = await binding.limit({ key: `${bucket}:${key}` });
  if (success) return null;
  return Response.json({ error: "Too many requests. Slow down and try again shortly." }, { status: 429, headers: { "retry-after": "60" } });
}
