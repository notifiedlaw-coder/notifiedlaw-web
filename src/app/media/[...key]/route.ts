import { getCloudflareContext } from "@opennextjs/cloudflare";

const TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg" };

// Streams public videos and audio from the VIDEOS R2 bucket, with Range support so browsers can
// start playback immediately and scrub.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const type = TYPES[key.split(".").pop() ?? ""];
  if (!type || key.includes("..")) return new Response("Not found", { status: 404 });

  const { env } = getCloudflareContext();
  const bucket = env.VIDEOS;
  const hasRange = request.headers.has("range");
  const obj = await bucket.get(key, hasRange ? { range: request.headers } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=86400",
    etag: obj.httpEtag,
  });
  let status = 200;
  if (hasRange && obj.range && "offset" in obj.range) {
    const { offset = 0, length = obj.size - offset } = obj.range;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("content-length", String(length));
    status = 206;
  } else {
    headers.set("content-length", String(obj.size));
  }
  return new Response(obj.body, { status, headers });
}
