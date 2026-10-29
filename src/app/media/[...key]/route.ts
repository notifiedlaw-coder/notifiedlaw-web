import { getCloudflareContext } from "@opennextjs/cloudflare";
import { clientKey } from "@/lib/client-key";
import { limitedBy } from "@/lib/rate-limit";

const TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", webp: "image/webp" };

// Streams public videos, audio and images from the VIDEOS R2 bucket, with Range support so browsers can
// start playback immediately and scrub.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const type = TYPES[key.split(".").pop() ?? ""];
  if (!type || key.length > 300 || key.includes("..") || /[\\\x00-\x1f]/.test(key)) return new Response("Not found", { status: 404 });

  // Per signed-in session, else per IP: a shared campus IP does not run every student out of media together.
  const { env } = getCloudflareContext();
  const rl = await limitedBy("MEDIA", [await clientKey(request, env.BETTER_AUTH_SECRET)]);
  if (rl) return rl;

  const bucket = env.VIDEOS;
  const hasRange = request.headers.has("range");
  const obj = await bucket.get(key, hasRange ? { range: request.headers } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "content-type": type,
    "accept-ranges": "bytes",
    // Images are versioned by key, so they can sit in caches for a year.
    "cache-control": type.startsWith("image/") ? "public, max-age=31536000, immutable" : "public, max-age=86400",
    etag: obj.httpEtag,
  });
  let status = 200;
  if (hasRange && obj.range) {
    // R2 reports a "bytes=-N" request as a suffix, not an offset; without this it went out as a 200
    // whose content-length claimed the whole file.
    const r = obj.range as { offset?: number; length?: number; suffix?: number };
    const suffix = r.suffix !== undefined ? Math.min(r.suffix, obj.size) : undefined;
    const offset = suffix !== undefined ? obj.size - suffix : (r.offset ?? 0);
    const length = suffix ?? r.length ?? obj.size - offset;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("content-length", String(length));
    status = 206;
  } else {
    headers.set("content-length", String(obj.size));
  }
  return new Response(obj.body, { status, headers });
}
