import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { chatGroup, userAvatar } from "@/db/schema";
import { getDb, userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ key: string[] }> };

/**
 * GET /api/avatars/<u|g>/<id>/<uuid>.webp: a profile or group picture, for signed-in users only. Keys are random and
 * change on every upload, so a picture can be cached for good. Only a picture a profile or group still uses is
 * served, so a replaced picture, or one left behind by a failed delete, cannot be fetched by its old address.
 */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return new Response(null, { status: 401 });
  const rl = await limited(req, "MEDIA", userId);
  if (rl) return rl;
  const path = (await params).key.join("/");
  if (!/^[ug]\/[\w-]{1,64}\/[0-9a-f-]{36}\.webp$/.test(path)) return new Response(null, { status: 404 });
  const key = `avatars/${path}`;
  const [kind, id] = path.split("/");
  const [ref] = kind === "u"
    ? await getDb().select({ key: userAvatar.key }).from(userAvatar).where(eq(userAvatar.userId, id))
    : await getDb().select({ key: chatGroup.avatarKey }).from(chatGroup).where(eq(chatGroup.id, id));
  if (ref?.key !== key) return new Response(null, { status: 404 });
  const obj = await getCloudflareContext().env.FILES.get(key);
  if (!obj) return new Response(null, { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": "image/webp", "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" },
  });
}
