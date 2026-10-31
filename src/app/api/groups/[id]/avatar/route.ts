import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { membership, setGroupAvatar } from "@/lib/groups";
import { MAX_AVATAR_UPLOAD, deleteAvatar, storeAvatar, toAvatar } from "@/lib/avatars";
import { avatarUrl } from "@/lib/friend-view";

type Ctx = { params: Promise<{ id: string }> };

async function admin(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return { res: Response.json({ error: "unauthenticated" }, { status: 401 }) };
  const rl = await limited(req, "AVATARS", userId);
  if (rl) return { res: rl };
  const m = await membership(userId, (await params).id);
  if (!m) return { res: Response.json({ error: "Group not found." }, { status: 404 }) };
  if (m.group.ownerId !== userId) return { res: Response.json({ error: "Only the admin can change the group picture." }, { status: 403 }) };
  return { group: m.group };
}

/** POST /api/groups/<id>/avatar (the photo as the body): the admin sets the group picture, as a 256 px WebP. */
export async function POST(req: Request, ctx: Ctx) {
  const a = await admin(req, ctx);
  if ("res" in a) return a.res;
  const bytes = await readBytes(req, MAX_AVATAR_UPLOAD);
  if (!bytes?.length) return Response.json({ error: "Choose a photo under 8 MB." }, { status: 400 });
  const webp = await toAvatar(bytes);
  if (typeof webp === "string") return Response.json({ error: webp }, { status: 400 });
  const key = await storeAvatar(`g/${a.group.id}`, webp, a.group.avatarKey);
  await setGroupAvatar(a.group.id, key);
  return Response.json({ avatar: avatarUrl(key) });
}

/** DELETE /api/groups/<id>/avatar: the admin removes the group picture. */
export async function DELETE(req: Request, ctx: Ctx) {
  const a = await admin(req, ctx);
  if ("res" in a) return a.res;
  await setGroupAvatar(a.group.id, null);
  await deleteAvatar(a.group.avatarKey);
  return Response.json({ avatar: null });
}
