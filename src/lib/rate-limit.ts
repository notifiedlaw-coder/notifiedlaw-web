import { getCloudflareContext } from "@opennextjs/cloudflare";

type Bucket = "WRITES" | "READS" | "ADMIN" | "MEDIA" | "UNI_EMAIL" | "TIMETABLE" | "CALLS" | "MESSAGES" | "AVATARS" | "TYPING";

/** Buckets set faster than a person works: going over one keeps refusing that key for this long (ms). */
const BLOCK_MS: Partial<Record<Bucket, number>> = { TIMETABLE: 5 * 60_000 };
const BLOCK_MESSAGE: Partial<Record<Bucket, string>> = { TIMETABLE: "Changes are coming in faster than a person makes them, so saving is paused for a few minutes." };
const MAX_BLOCKED = 10_000;
/** `bucket:key` to until when (epoch ms). Per isolate, so best effort; the binding still limits without it. */
const blocked = new Map<string, number>();

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
  const now = Date.now();
  const ids = keys.map((key) => `${bucket}:${key}`);
  const until = Math.max(0, ...ids.map((id) => blocked.get(id) ?? 0));
  if (until > now) return tooMany(bucket, Math.ceil((until - now) / 1000));
  const results = await Promise.all(ids.map((id) => binding.limit({ key: id })));
  if (results.every((r) => r.success)) return null;
  const block = BLOCK_MS[bucket];
  if (!block) return tooMany(bucket, 60);
  ids.forEach((id, i) => {
    if (results[i].success) return;
    if (blocked.size >= MAX_BLOCKED) blocked.delete(blocked.keys().next().value!);
    blocked.set(id, now + block);
  });
  return tooMany(bucket, block / 1000);
}

function tooMany(bucket: Bucket, seconds: number) {
  const error = BLOCK_MESSAGE[bucket] ?? "Too many requests. Slow down and try again shortly.";
  return Response.json({ error }, { status: 429, headers: { "retry-after": String(seconds) } });
}
