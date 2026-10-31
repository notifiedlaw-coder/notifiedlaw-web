import { getCloudflareContext } from "@opennextjs/cloudflare";
import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ key: string[] }> };

/**
 * GET /api/avatars/<u|g>/<id>/<uuid>.webp: a profile or group picture, for signed-in users only. Keys are random and
 * change on every upload, so a picture can be cached for good.
 */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return new Response(null, { status: 401 });
  const rl = await limited(req, "MEDIA", userId);
  if (rl) return rl;
  const path = (await params).key.join("/");
  if (!/^[ug]\/[\w-]{1,64}\/[0-9a-f-]{36}\.webp$/.test(path)) return new Response(null, { status: 404 });
  const obj = await getCloudflareContext().env.FILES.get(`avatars/${path}`);
  if (!obj) return new Response(null, { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": "image/webp", "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" },
  });
}
